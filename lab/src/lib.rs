//! Posing a problem as ML, and measuring it.
//!
//! A [`Formulation`] owns its problem: what it reads, how it builds its inputs, the model, what
//! counts as right. What's shared is only what every run needs, whatever it's about: which data it
//! ran on ([`Snapshot`]); what it scored, kept ([`Run`], [`Runs`]); and many runs over a grid of
//! parameters ([`sweep`], [`Grid`], [`table`]).
//!
//! ```no_run
//! use phoneme_lab::{Formulation, Grid, now, sweep, table};
//! # fn go<F: Formulation>(f: F) -> Result<(), phoneme_lab::Error> {
//! let data = f.read(now())?;
//! let grid = Grid::new().axis("words", [20_000, 50_000]).axis("tau", [0.05, 0.1]);
//! let mut runs = Vec::new();
//! sweep(&f, &data, grid.points::<F::Params>()?, &mut runs)?;
//! println!("{}", table(&runs, "top1"));
//! # Ok(()) }
//! ```

pub mod vectors;

use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

pub type Error = Box<dyn std::error::Error + Send + Sync>;
pub type Result<T, E = Error> = std::result::Result<T, E>;

/// What a run scored: a flat map of name to number, so a sweep's runs compare side by side.
pub type Metrics = BTreeMap<String, f64>;

/// One problem posed as ML.
pub trait Formulation {
    const NAME: &'static str;
    /// Bumped when what it reads or how it scores changes, so runs before and after aren't
    /// compared as if they were the same thing.
    const VERSION: u32;
    type Params: Serialize + DeserializeOwned;

    /// The formulation's own query, over everything up to `until`, in milliseconds since the
    /// epoch. Read again with the same `until`, it's the same data, as far as its source keeps what
    /// was: an append-only log does; records edited since don't, and the fingerprint says so.
    fn read(&self, until: u64) -> Result<Snapshot>;

    /// One run on `data` with `params`.
    fn run(&self, data: &Snapshot, params: &Self::Params) -> Result<Metrics>;

    /// `name@version`, as a run names it.
    fn id() -> String {
        format!("{}@{}", Self::NAME, Self::VERSION)
    }
}

/// What a formulation read, as a pointer rather than a copy: everything up to `until`, and a
/// fingerprint of the rows that gave. The rows are held while the runs use them, and never kept.
/// Reading at the same `until` again is the same data exactly when the fingerprint matches.
pub struct Snapshot {
    until: u64,
    bytes: Vec<u8>,
    fingerprint: String,
}

impl Snapshot {
    /// `rows`, read as of `until`, in the order given.
    pub fn of<T: Serialize>(until: u64, rows: impl IntoIterator<Item = T>) -> Result<Self> {
        let mut bytes = Vec::new();
        for row in rows {
            serde_json::to_writer(&mut bytes, &row)?;
            bytes.push(b'\n');
        }
        let digest = Sha256::digest(&bytes);
        let fingerprint = digest[..8].iter().map(|b| format!("{b:02x}")).collect();
        Ok(Self {
            until,
            bytes,
            fingerprint,
        })
    }

    /// What was read covers everything up to here, in milliseconds since the epoch.
    pub fn until(&self) -> u64 {
        self.until
    }

    /// The first 16 hex digits of the SHA-256 of the rows as read.
    pub fn fingerprint(&self) -> &str {
        &self.fingerprint
    }

    /// The rows, read back as `T`.
    pub fn rows<T: DeserializeOwned>(&self) -> Result<Vec<T>> {
        self.bytes
            .split(|b| *b == b'\n')
            .filter(|line| !line.is_empty())
            .map(|line| Ok(serde_json::from_slice(line)?))
            .collect()
    }

    pub fn len(&self) -> usize {
        self.bytes.iter().filter(|b| **b == b'\n').count()
    }

    pub fn is_empty(&self) -> bool {
        self.bytes.is_empty()
    }
}

/// Now, in milliseconds since the epoch: the `until` of a read of everything there is.
pub fn now() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |d| d.as_millis() as u64)
}

/// One formulation, one snapshot, one set of parameters, and what it scored.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Run {
    /// `name@version`.
    pub formulation: String,
    /// What it read: everything up to this moment, in milliseconds since the epoch.
    pub until: u64,
    /// The fingerprint of the rows that read gave.
    pub snapshot: String,
    pub params: Value,
    pub metrics: Metrics,
}

/// Where runs are kept.
pub trait Runs {
    fn record(&mut self, run: &Run) -> Result<()>;
}

impl Runs for Vec<Run> {
    fn record(&mut self, run: &Run) -> Result<()> {
        self.push(run.clone());
        Ok(())
    }
}

/// Runs appended to a JSON-lines file.
pub struct RunFile(pub PathBuf);

impl Runs for RunFile {
    fn record(&mut self, run: &Run) -> Result<()> {
        if let Some(dir) = self.0.parent() {
            fs::create_dir_all(dir)?;
        }
        let mut line = serde_json::to_vec(run)?;
        line.push(b'\n');
        OpenOptions::new()
            .create(true)
            .append(true)
            .open(&self.0)?
            .write_all(&line)?;
        Ok(())
    }
}

/// One run per point, each recorded as it finishes, so a sweep stopped part way keeps what it
/// did.
pub fn sweep<F: Formulation>(
    f: &F,
    data: &Snapshot,
    grid: impl IntoIterator<Item = F::Params>,
    runs: &mut impl Runs,
) -> Result<Vec<Run>> {
    let mut done = Vec::new();
    for params in grid {
        let run = Run {
            formulation: F::id(),
            until: data.until(),
            snapshot: data.fingerprint().to_string(),
            params: serde_json::to_value(&params)?,
            metrics: f.run(data, &params)?,
        };
        runs.record(&run)?;
        done.push(run);
    }
    Ok(done)
}

/// Named axes, each a list of values, crossed. An axis with one value is a fixed parameter.
#[derive(Clone, Default)]
pub struct Grid {
    axes: Vec<(String, Vec<Value>)>,
}

impl Grid {
    pub fn new() -> Self {
        Self::default()
    }

    /// Adds an axis. A later axis of the same name replaces the earlier.
    pub fn axis<T: Serialize>(mut self, name: &str, values: impl IntoIterator<Item = T>) -> Self {
        let values = values
            .into_iter()
            .map(|v| serde_json::to_value(v).unwrap_or(Value::Null))
            .collect();
        self.axes.retain(|(n, _)| n != name);
        self.axes.push((name.to_string(), values));
        self
    }

    /// Every point, as parameters: each is an object of the axes' names, read as `P`.
    pub fn points<P: DeserializeOwned>(&self) -> Result<Vec<P>> {
        let mut points = vec![Map::new()];
        for (name, values) in &self.axes {
            points = points
                .into_iter()
                .flat_map(|point| {
                    values.iter().map(move |v| {
                        let mut point = point.clone();
                        point.insert(name.clone(), v.clone());
                        point
                    })
                })
                .collect();
        }
        points
            .into_iter()
            .map(|point| Ok(serde_json::from_value(Value::Object(point))?))
            .collect()
    }
}

/// The runs as a table, best first by the metric `by`: the parameters that differ between them,
/// then every metric.
pub fn table(runs: &[Run], by: &str) -> String {
    let swept: Vec<String> = runs
        .first()
        .and_then(|run| run.params.as_object())
        .map(|first| {
            first
                .keys()
                .filter(|key| {
                    runs.iter()
                        .any(|run| run.params.get(*key) != first.get(*key))
                })
                .cloned()
                .collect()
        })
        .unwrap_or_default();
    let metrics: Vec<String> = runs
        .iter()
        .flat_map(|run| run.metrics.keys().cloned())
        .collect::<std::collections::BTreeSet<_>>()
        .into_iter()
        .collect();

    let mut sorted: Vec<&Run> = runs.iter().collect();
    let score = |run: &Run| run.metrics.get(by).copied().unwrap_or(f64::NEG_INFINITY);
    sorted.sort_by(|a, b| score(b).total_cmp(&score(a)));

    let mut rows = vec![swept.iter().chain(&metrics).cloned().collect::<Vec<_>>()];
    for run in sorted {
        let mut row: Vec<String> = swept
            .iter()
            .map(|key| match run.params.get(key) {
                Some(Value::String(s)) => s.clone(),
                Some(v) => v.to_string(),
                None => "-".to_string(),
            })
            .collect();
        row.extend(metrics.iter().map(|key| match run.metrics.get(key) {
            Some(x) if x.fract() == 0.0 && x.abs() < 1e9 => format!("{x}"),
            Some(x) => format!("{x:.3}"),
            None => "-".to_string(),
        }));
        rows.push(row);
    }
    let widths: Vec<usize> = (0..rows[0].len())
        .map(|c| rows.iter().map(|r| r[c].chars().count()).max().unwrap_or(0))
        .collect();
    rows.iter()
        .map(|row| {
            row.iter()
                .zip(&widths)
                .map(|(cell, w)| format!("{cell:<w$}"))
                .collect::<Vec<_>>()
                .join("  ")
                .trim_end()
                .to_string()
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Train on the past, test on the future: the rows before `cut`, and the rest. On personal data a
/// random split leaks and flatters. Which field is the time is the formulation's.
pub fn split_by_time<T>(rows: Vec<T>, cut: i64, time: impl Fn(&T) -> i64) -> (Vec<T>, Vec<T>) {
    rows.into_iter().partition(|row| time(row) < cut)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[derive(Serialize, Deserialize, Debug, PartialEq)]
    struct P {
        words: usize,
        tau: f64,
    }

    struct Count;

    impl Formulation for Count {
        const NAME: &'static str = "count";
        const VERSION: u32 = 1;
        type Params = P;
        fn read(&self, until: u64) -> Result<Snapshot> {
            Snapshot::of(until, [1, 2, 3])
        }
        fn run(&self, data: &Snapshot, p: &P) -> Result<Metrics> {
            let rows: Vec<i64> = data.rows()?;
            Ok(Metrics::from([(
                "score".to_string(),
                rows.iter().sum::<i64>() as f64 * p.tau,
            )]))
        }
    }

    #[test]
    fn a_snapshot_is_fingerprinted_by_its_rows() {
        let a = Snapshot::of(5, [1, 2]).unwrap();
        assert_eq!(
            a.fingerprint(),
            Snapshot::of(9, [1, 2]).unwrap().fingerprint()
        );
        assert_ne!(
            a.fingerprint(),
            Snapshot::of(5, [2, 1]).unwrap().fingerprint()
        );
        assert_eq!(a.rows::<i32>().unwrap(), [1, 2]);
        assert_eq!(a.until(), 5);
    }

    #[test]
    fn a_grid_crosses_its_axes() {
        let points: Vec<P> = Grid::new()
            .axis("words", [1, 2])
            .axis("tau", [0.5, 1.0, 2.0])
            .points()
            .unwrap();
        assert_eq!(points.len(), 6);
        assert_eq!(points[5], P { words: 2, tau: 2.0 });
    }

    #[test]
    fn a_sweep_records_each_run_and_the_table_shows_what_was_swept() {
        let f = Count;
        let data = f.read(7).unwrap();
        let grid = Grid::new().axis("words", [7]).axis("tau", [1.0, 2.0]);
        let mut kept = Vec::new();
        let runs = sweep(&f, &data, grid.points().unwrap(), &mut kept).unwrap();
        assert_eq!(kept, runs);
        assert_eq!(runs[0].formulation, "count@1");
        assert_eq!(runs[0].until, 7);

        let table = table(&runs, "score");
        let lines: Vec<&str> = table.lines().collect();
        assert_eq!(lines[0], "tau  score");
        assert_eq!(lines[1], "2.0  12");
    }

    #[test]
    fn a_time_split_keeps_order() {
        let (past, future) = split_by_time(vec![1, 5, 2, 8], 4, |x| *x);
        assert_eq!((past, future), (vec![1, 2], vec![5, 8]));
    }
}
