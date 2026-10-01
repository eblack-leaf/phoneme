//! Running a model in an app.
//!
//! On CPU, loaded from a path, with nothing used for training: an app that links this pulls in no
//! autodiff and no dataset code. The first model is a table lookup and a mean, which needs no
//! framework at all.
//!
//! ```no_run
//! use phoneme_runtime::{Builder, Embeddings};
//!
//! let words = Embeddings::load("glove.6B.100d.emb")?;
//! let mut builder = Builder::new(words.dim());
//! for (category, text) in [("home", "fix the sink"), ("work", "review the pull request")] {
//!     if let Some(v) = words.mean(text) {
//!         builder.add(category, &v);
//!     }
//! }
//! let head = builder.build(&words, 1.0);
//! let best = words.mean("water the plants").and_then(|v| head.nearest(&v));
//! # Ok::<(), std::io::Error>(())
//! ```

use half::f16;
use std::collections::{BTreeMap, HashMap};
use std::fs::File;
use std::io::{self, BufReader, BufWriter, Read, Write};
use std::path::Path;

/// The first bytes of an embeddings file, and its version.
const MAGIC: &[u8; 8] = b"PHNMEMB1";

/// Words as the lab and the app both see them: lowercased, split on anything not a letter or a
/// digit. One function, used by both, so what a model was trained on is what it's given.
pub fn tokens(text: &str) -> impl Iterator<Item = String> + '_ {
    text.split(|c: char| !c.is_alphanumeric())
        .filter(|word| !word.is_empty())
        .map(str::to_lowercase)
}

/// A table of words to vectors.
///
/// On disk: `PHNMEMB1`, the dimension and the word count as little-endian `u32`s, each word as a
/// `u16` length and its UTF-8 bytes, then every vector in the words' order as `f16`s. Words go
/// most frequent first, so the first `n` of a file are its `n` most frequent: a smaller cut is a
/// prefix of a larger one.
pub struct Embeddings {
    dim: usize,
    words: Vec<String>,
    index: HashMap<String, usize>,
    vectors: Vec<f32>,
}

impl Embeddings {
    /// An empty table of vectors `dim` long.
    pub fn new(dim: usize) -> Self {
        Self {
            dim,
            words: Vec::new(),
            index: HashMap::new(),
            vectors: Vec::new(),
        }
    }

    /// Every word in the file.
    pub fn load(path: impl AsRef<Path>) -> io::Result<Self> {
        Self::load_top(path, usize::MAX)
    }

    /// The file's first `n` words, which are its most frequent.
    pub fn load_top(path: impl AsRef<Path>, n: usize) -> io::Result<Self> {
        let mut file = BufReader::new(File::open(path)?);
        let mut magic = [0; 8];
        file.read_exact(&mut magic)?;
        if &magic != MAGIC {
            return Err(invalid("not a phoneme embeddings file"));
        }
        let dim = read_u32(&mut file)? as usize;
        let count = read_u32(&mut file)? as usize;
        let take = count.min(n);

        let mut table = Self::new(dim);
        let mut words = Vec::with_capacity(count);
        for _ in 0..count {
            let mut len = [0; 2];
            file.read_exact(&mut len)?;
            let mut bytes = vec![0; u16::from_le_bytes(len) as usize];
            file.read_exact(&mut bytes)?;
            words.push(String::from_utf8(bytes).map_err(|_| invalid("a word isn't UTF-8"))?);
        }
        let mut raw = vec![0; take * dim * 2];
        file.read_exact(&mut raw)?;
        let vectors: Vec<f32> = raw
            .chunks_exact(2)
            .map(|b| f16::from_le_bytes([b[0], b[1]]).to_f32())
            .collect();
        for (word, vector) in words.into_iter().take(take).zip(vectors.chunks_exact(dim)) {
            table.push(word, vector);
        }
        Ok(table)
    }

    /// Adds a word, after every word already here. A word already here, or a vector of the wrong
    /// length, is passed over.
    pub fn push(&mut self, word: String, vector: &[f32]) {
        if vector.len() != self.dim || self.index.contains_key(&word) || word.len() > 0xffff {
            return;
        }
        self.index.insert(word.clone(), self.words.len());
        self.words.push(word);
        self.vectors.extend_from_slice(vector);
    }

    /// Writes the table in its order.
    pub fn write(&self, path: impl AsRef<Path>) -> io::Result<()> {
        let mut file = BufWriter::new(File::create(path)?);
        file.write_all(MAGIC)?;
        file.write_all(&(self.dim as u32).to_le_bytes())?;
        file.write_all(&(self.words.len() as u32).to_le_bytes())?;
        for word in &self.words {
            file.write_all(&(word.len() as u16).to_le_bytes())?;
            file.write_all(word.as_bytes())?;
        }
        for x in &self.vectors {
            file.write_all(&f16::from_f32(*x).to_le_bytes())?;
        }
        file.flush()
    }

    pub fn dim(&self) -> usize {
        self.dim
    }

    pub fn len(&self) -> usize {
        self.words.len()
    }

    pub fn is_empty(&self) -> bool {
        self.words.is_empty()
    }

    /// A word's vector, if the table has the word.
    pub fn get(&self, word: &str) -> Option<&[f32]> {
        let at = *self.index.get(word)?;
        Some(&self.vectors[at * self.dim..(at + 1) * self.dim])
    }

    /// The mean of the vectors of the words in `text` the table has. `None` when it has none of
    /// them: there's nothing to say about the text.
    pub fn mean(&self, text: &str) -> Option<Vec<f32>> {
        let mut sum = vec![0.0; self.dim];
        let mut n = 0;
        for word in tokens(text) {
            if let Some(v) = self.get(&word) {
                add(&mut sum, v, 1.0);
                n += 1;
            }
        }
        (n > 0).then(|| sum.into_iter().map(|x| x / n as f32).collect())
    }
}

/// Collects labelled vectors into prototypes: one per label, the mean of its vectors' directions.
///
/// Kept apart from [`Prototypes`] so what's been added can be built at any moment, which is what
/// both a replay (every add, in order) and an app (every change to what it holds) need.
pub struct Builder {
    dim: usize,
    sums: BTreeMap<String, Vec<f32>>,
}

impl Builder {
    pub fn new(dim: usize) -> Self {
        Self {
            dim,
            sums: BTreeMap::new(),
        }
    }

    /// One example of `label`. Its direction counts, not its length.
    pub fn add(&mut self, label: &str, vector: &[f32]) {
        if vector.len() != self.dim {
            return;
        }
        let sum = self
            .sums
            .entry(label.to_string())
            .or_insert_with(|| vec![0.0; self.dim]);
        add(sum, &unit(vector), 1.0);
    }

    /// Whether anything has been added.
    pub fn is_empty(&self) -> bool {
        self.sums.is_empty()
    }

    /// The prototypes as they stand. Each label's own name, read through `words`, counts as
    /// `prior` examples of it: what the name means, before any example says what I mean by it.
    pub fn build(&self, words: &Embeddings, prior: f32) -> Prototypes {
        Prototypes::new(self.sums.iter().map(|(label, sum)| {
            let mut v = sum.clone();
            if prior > 0.0
                && let Some(name) = words.mean(label)
            {
                add(&mut v, &unit(&name), prior);
            }
            (label.clone(), v)
        }))
    }
}

/// One vector per label, and which one a vector is nearest.
pub struct Prototypes {
    labels: Vec<String>,
    vectors: Vec<Vec<f32>>,
}

/// The nearest prototype: its label, its cosine, and how far ahead of the next it is.
#[derive(Clone, Debug, PartialEq)]
pub struct Nearest {
    pub label: String,
    pub score: f32,
    /// The score less the second's. The score itself when there's only one label.
    pub margin: f32,
}

impl Prototypes {
    /// From each label's vector, which is taken as a direction.
    pub fn new(named: impl IntoIterator<Item = (String, Vec<f32>)>) -> Self {
        let (labels, vectors) = named.into_iter().map(|(l, v)| (l, unit(&v))).unzip();
        Self { labels, vectors }
    }

    pub fn len(&self) -> usize {
        self.labels.len()
    }

    pub fn is_empty(&self) -> bool {
        self.labels.is_empty()
    }

    /// Every label by its cosine to `v`, nearest first.
    pub fn ranked(&self, v: &[f32]) -> Vec<(&str, f32)> {
        let v = unit(v);
        let mut all: Vec<(&str, f32)> = self
            .labels
            .iter()
            .zip(&self.vectors)
            .map(|(label, p)| (label.as_str(), dot(p, &v)))
            .collect();
        all.sort_by(|a, b| b.1.total_cmp(&a.1).then_with(|| a.0.cmp(b.0)));
        all
    }

    /// The nearest label to `v`, if there are any.
    pub fn nearest(&self, v: &[f32]) -> Option<Nearest> {
        let ranked = self.ranked(v);
        let (label, score) = *ranked.first()?;
        let margin = ranked.get(1).map_or(score, |(_, second)| score - second);
        Some(Nearest {
            label: label.to_string(),
            score,
            margin,
        })
    }
}

fn add(sum: &mut [f32], v: &[f32], weight: f32) {
    for (s, x) in sum.iter_mut().zip(v) {
        *s += weight * x;
    }
}

fn dot(a: &[f32], b: &[f32]) -> f32 {
    a.iter().zip(b).map(|(x, y)| x * y).sum()
}

/// `v` at length one; zero stays zero.
fn unit(v: &[f32]) -> Vec<f32> {
    let norm = dot(v, v).sqrt();
    if norm == 0.0 {
        return v.to_vec();
    }
    v.iter().map(|x| x / norm).collect()
}

fn read_u32(file: &mut impl Read) -> io::Result<u32> {
    let mut b = [0; 4];
    file.read_exact(&mut b)?;
    Ok(u32::from_le_bytes(b))
}

fn invalid(why: &str) -> io::Error {
    io::Error::new(io::ErrorKind::InvalidData, why)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn table() -> Embeddings {
        let mut words = Embeddings::new(2);
        words.push("home".into(), &[1.0, 0.0]);
        words.push("sink".into(), &[0.9, 0.1]);
        words.push("work".into(), &[0.0, 1.0]);
        words.push("review".into(), &[0.1, 0.9]);
        words
    }

    #[test]
    fn words_are_lowercased_and_split_on_anything_else() {
        let got: Vec<String> = tokens("Fix the SINK, re-do it2!").collect();
        assert_eq!(got, ["fix", "the", "sink", "re", "do", "it2"]);
    }

    #[test]
    fn a_mean_skips_words_it_does_not_have() {
        let words = table();
        assert_eq!(words.mean("the home and the work"), Some(vec![0.5, 0.5]));
        assert_eq!(words.mean("nothing known"), None);
    }

    #[test]
    fn a_file_reads_back_and_a_prefix_is_the_most_frequent() {
        let path = std::env::temp_dir().join(format!("phoneme-{}.emb", std::process::id()));
        table().write(&path).unwrap();

        let all = Embeddings::load(&path).unwrap();
        assert_eq!(all.len(), 4);
        // f16 on disk: about three decimal digits.
        let review = all.get("review").unwrap();
        assert!((review[0] - 0.1).abs() < 1e-3 && (review[1] - 0.9).abs() < 1e-3);

        let top = Embeddings::load_top(&path, 2).unwrap();
        assert_eq!(top.len(), 2);
        assert!(top.get("sink").is_some() && top.get("work").is_none());
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn the_nearest_prototype_says_by_how_much() {
        let words = table();
        let mut builder = Builder::new(2);
        builder.add("chores", &words.mean("sink").unwrap());
        builder.add("job", &words.mean("review").unwrap());
        let head = builder.build(&words, 0.0);

        let best = head.nearest(&words.mean("home").unwrap()).unwrap();
        assert_eq!(best.label, "chores");
        assert!(best.margin > 0.5);
        assert_eq!(head.ranked(&[0.0, 1.0])[0].0, "job");
    }

    #[test]
    fn a_label_named_like_a_word_leans_toward_it() {
        let words = table();
        let mut builder = Builder::new(2);
        // One example each, pointing the same way: only the names tell them apart.
        builder.add("home", &[1.0, 1.0]);
        builder.add("work", &[1.0, 1.0]);
        let head = builder.build(&words, 1.0);
        assert_eq!(head.nearest(&[1.0, 0.2]).unwrap().label, "home");
        assert_eq!(head.nearest(&[0.2, 1.0]).unwrap().label, "work");
    }
}
