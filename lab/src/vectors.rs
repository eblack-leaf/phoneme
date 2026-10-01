//! Pretrained word vectors: fetched once, cut to the most frequent words, and kept as
//! [`Embeddings`] files. Only the cuts are kept; the download is removed once they're made.

use crate::Result;
use phoneme_runtime::Embeddings;
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};

/// GloVe 6B: Wikipedia and Gigaword, 400k words, uncased, in 50, 100, 200 and 300 dimensions.
pub const GLOVE_6B: &str = "https://nlp.stanford.edu/data/glove.6B.zip";

/// Where a GloVe 6B cut is kept in `dir`: `glove.6B.<dim>d.emb`.
pub fn glove_path(dir: &Path, dim: u32) -> PathBuf {
    dir.join(format!("glove.6B.{dim}d.emb"))
}

/// Fetches GloVe 6B into `dir` and cuts each of `dims` to its first `words` words. A cut already
/// there is kept, and when every one is there nothing is fetched. `say` hears how it's going.
pub fn glove(
    dir: &Path,
    dims: &[u32],
    words: usize,
    say: &mut dyn FnMut(String),
) -> Result<Vec<PathBuf>> {
    fs::create_dir_all(dir)?;
    let wanted: Vec<u32> = dims
        .iter()
        .copied()
        .filter(|dim| !glove_path(dir, *dim).exists())
        .collect();
    if !wanted.is_empty() {
        let zip = dir.join("glove.6B.zip");
        if !zip.exists() {
            download(GLOVE_6B, &zip, say)?;
        }
        let mut archive = zip::ZipArchive::new(File::open(&zip)?)?;
        for dim in &wanted {
            let name = format!("glove.6B.{dim}d.txt");
            say(format!("cutting {name} to {words} words"));
            let table = cut(BufReader::new(archive.by_name(&name)?), words)?;
            let path = glove_path(dir, *dim);
            let partial = path.with_extension("partial");
            table.write(&partial)?;
            fs::rename(&partial, &path)?;
        }
        fs::remove_file(&zip)?;
    }
    Ok(dims.iter().map(|dim| glove_path(dir, *dim)).collect())
}

/// Vectors as text, a word and its numbers a line, most frequent first, cut to the first `words`.
/// GloVe's text and fastText's `.vec` both read: a first line of two numbers is fastText's header.
pub fn cut(text: impl BufRead, words: usize) -> Result<Embeddings> {
    let mut table: Option<Embeddings> = None;
    for (n, line) in text.lines().enumerate() {
        let line = line?;
        let mut parts = line.split(' ').filter(|p| !p.is_empty());
        let Some(word) = parts.next() else { continue };
        let numbers: Vec<f32> = parts.map(str::parse).collect::<Result<_, _>>()?;
        if n == 0 && numbers.len() == 1 && word.parse::<usize>().is_ok() {
            continue;
        }
        let table = table.get_or_insert_with(|| Embeddings::new(numbers.len()));
        table.push(word.to_string(), &numbers);
        if table.len() >= words {
            break;
        }
    }
    table.ok_or_else(|| "no vectors in the text".into())
}

fn download(url: &str, to: &Path, say: &mut dyn FnMut(String)) -> Result<()> {
    say(format!("fetching {url}"));
    let partial = to.with_extension("partial");
    let mut body = ureq::get(url).call()?.into_body().into_reader();
    let mut file = File::create(&partial)?;
    let mut buf = vec![0; 1 << 16];
    let (mut got, mut told) = (0u64, 0u64);
    loop {
        let n = match body.read(&mut buf) {
            Ok(0) => break,
            Ok(n) => n,
            Err(e) if e.kind() == io::ErrorKind::Interrupted => continue,
            Err(e) => return Err(e.into()),
        };
        file.write_all(&buf[..n])?;
        got += n as u64;
        if got - told >= 100_000_000 {
            told = got;
            say(format!("  {} MB", got / 1_000_000));
        }
    }
    file.flush()?;
    fs::rename(&partial, to)?;
    say(format!("  {} MB, done", got / 1_000_000));
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn glove_and_fasttext_text_both_cut() {
        let glove = "the 0.1 0.2\nof 0.3 0.4\nand 0.5 0.6\n";
        let table = cut(glove.as_bytes(), 2).unwrap();
        assert_eq!((table.len(), table.dim()), (2, 2));
        assert!(table.get("and").is_none());

        let fasttext = "3 2\nthe 0.1 0.2\nof 0.3 0.4\nand 0.5 0.6\n";
        let table = cut(fasttext.as_bytes(), 10).unwrap();
        assert_eq!(table.len(), 3);
        assert!(table.get("3").is_none());
    }
}
