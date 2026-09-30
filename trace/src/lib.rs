//! Usage events.
//!
//! An app emits an event where something worth noticing happens, and sends what it has emitted
//! when it chooses. Events are notifications, not data: nothing reads them to decide what is true,
//! so nothing here blocks or fails the app. A line that can't be written is lost and counted.
//!
//! ```no_run
//! use phoneme_trace::{Event, FileSink, Trace};
//!
//! let trace = Trace::open("/home/me/.local/share/threads/trace", "threads");
//! trace.emit(Event::new("thread.add").set("category", "home").set("words", 3));
//!
//! // Whenever the app likes: on close, beside its own sync, never.
//! let _ = trace.send(&mut FileSink::open("/srv/events/threads.jsonl"));
//! ```
//!
//! On disk, beside each other in the trace's folder:
//!
//! | file | what |
//! |---|---|
//! | `<app>.jsonl` | every event emitted, one JSON object a line, only ever appended to |
//! | `<app>.sent` | how far into it `send` has got, in bytes |

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs::{self, File, OpenOptions};
use std::io::{self, Read, Seek, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};

/// Whatever went wrong in a send: the trace's own files, or the sink.
pub type Error = Box<dyn std::error::Error + Send + Sync>;

/// One thing that happened.
#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Event {
    /// Milliseconds since the Unix epoch, taken when the event was made.
    pub at: u64,
    /// Which app emitted it. Filled by [`Trace::emit`].
    pub app: String,
    /// What happened, in the app's own words: `thread.add`, `chip.send`.
    pub name: String,
    pub fields: BTreeMap<String, Value>,
}

impl Event {
    pub fn new(name: impl Into<String>) -> Self {
        let at = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);
        Self { at, app: String::new(), name: name.into(), fields: BTreeMap::new() }
    }

    pub fn set(mut self, key: impl Into<String>, value: impl Into<Value>) -> Self {
        self.fields.insert(key.into(), value.into());
        self
    }
}

/// Where sent events go. The trace doesn't know or care what's behind it.
pub trait Sink {
    /// Take these, or say why not. On an error the same events are offered again next send.
    fn accept(&mut self, events: &[Event]) -> Result<(), Error>;
}

/// Held in memory. For tests, and for a caller that wants the events in hand.
impl Sink for Vec<Event> {
    fn accept(&mut self, events: &[Event]) -> Result<(), Error> {
        self.extend_from_slice(events);
        Ok(())
    }
}

/// Appended to one JSON-lines file, which may gather events from any number of apps.
pub struct FileSink {
    path: PathBuf,
}

impl FileSink {
    pub fn open(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }
}

impl Sink for FileSink {
    fn accept(&mut self, events: &[Event]) -> Result<(), Error> {
        let mut buf = Vec::new();
        for event in events {
            serde_json::to_writer(&mut buf, event)?;
            buf.push(b'\n');
        }
        append(&self.path, &buf)?;
        Ok(())
    }
}

/// One app's events on this device.
pub struct Trace {
    app: String,
    log: PathBuf,
    sent: PathBuf,
    dropped: AtomicU64,
}

impl Trace {
    /// No I/O: the folder is made by the first emit that needs it.
    pub fn open(dir: impl Into<PathBuf>, app: impl Into<String>) -> Self {
        let dir = dir.into();
        let app = app.into();
        Self {
            log: dir.join(format!("{app}.jsonl")),
            sent: dir.join(format!("{app}.sent")),
            app,
            dropped: AtomicU64::new(0),
        }
    }

    /// Append one event. Never fails the caller: if the line can't be written it's lost, and
    /// [`dropped`](Self::dropped) says how many have been.
    pub fn emit(&self, mut event: Event) {
        event.app.clone_from(&self.app);
        let written = serde_json::to_vec(&event).map_err(io::Error::from).and_then(|mut line| {
            line.push(b'\n');
            // One write per line, so two processes emitting at once don't interleave.
            append(&self.log, &line)
        });
        if written.is_err() {
            self.dropped.fetch_add(1, Ordering::Relaxed);
        }
    }

    /// Events this trace couldn't write, since it was opened.
    pub fn dropped(&self) -> u64 {
        self.dropped.load(Ordering::Relaxed)
    }

    /// Offer the sink every event emitted since the last send it accepted, and say how many.
    ///
    /// At least once: a crash between the sink taking them and the mark moving offers them again.
    /// A line that isn't whole yet waits for the next send; one that won't parse is stepped over.
    pub fn send(&self, sink: &mut impl Sink) -> Result<usize, Error> {
        let mut log = match File::open(&self.log) {
            Ok(file) => file,
            Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(0),
            Err(e) => return Err(e.into()),
        };
        let mut from = self.mark()?;
        if from > log.metadata()?.len() {
            // The log is shorter than the mark: it was replaced. Start it over.
            from = 0;
        }
        log.seek(SeekFrom::Start(from))?;
        let mut tail = Vec::new();
        log.read_to_end(&mut tail)?;
        let Some(end) = tail.iter().rposition(|&b| b == b'\n').map(|i| i + 1) else {
            return Ok(0);
        };

        let events: Vec<Event> = tail[..end]
            .split(|&b| b == b'\n')
            .filter(|line| !line.is_empty())
            .filter_map(|line| serde_json::from_slice(line).ok())
            .collect();
        if !events.is_empty() {
            sink.accept(&events)?;
        }
        self.set_mark(from + end as u64)?;
        Ok(events.len())
    }

    fn mark(&self) -> Result<u64, Error> {
        match fs::read_to_string(&self.sent) {
            Ok(text) => Ok(text.trim().parse()?),
            Err(e) if e.kind() == io::ErrorKind::NotFound => Ok(0),
            Err(e) => Err(e.into()),
        }
    }

    fn set_mark(&self, at: u64) -> io::Result<()> {
        // Written aside and renamed over, so a crash leaves the old mark or the new one.
        let tmp = self.sent.with_extension("sent.tmp");
        fs::write(&tmp, at.to_string())?;
        fs::rename(&tmp, &self.sent)
    }
}

fn append(path: &Path, bytes: &[u8]) -> io::Result<()> {
    let open = || OpenOptions::new().create(true).append(true).open(path);
    let mut file = match open() {
        Err(e) if e.kind() == io::ErrorKind::NotFound => {
            if let Some(dir) = path.parent() {
                fs::create_dir_all(dir)?;
            }
            open()?
        }
        file => file?,
    };
    file.write_all(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn scratch() -> PathBuf {
        static N: AtomicU64 = AtomicU64::new(0);
        let dir = std::env::temp_dir().join(format!(
            "phoneme-trace-{}-{}",
            std::process::id(),
            N.fetch_add(1, Ordering::Relaxed)
        ));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    struct Refuses;
    impl Sink for Refuses {
        fn accept(&mut self, _: &[Event]) -> Result<(), Error> {
            Err("no".into())
        }
    }

    #[test]
    fn sends_what_was_emitted_once() {
        let trace = Trace::open(scratch(), "threads");
        trace.emit(Event::new("thread.add").set("category", "home").set("words", 3));
        trace.emit(Event::new("chip.send"));

        let mut got = Vec::new();
        assert_eq!(trace.send(&mut got).unwrap(), 2);
        assert_eq!(got[0].app, "threads");
        assert_eq!(got[0].fields["category"], "home");
        assert_eq!(got[0].fields["words"], 3);
        assert_eq!(got[1].name, "chip.send");

        assert_eq!(trace.send(&mut got).unwrap(), 0);
        assert_eq!(got.len(), 2);
        assert_eq!(trace.dropped(), 0);
    }

    #[test]
    fn a_later_send_takes_only_what_is_new() {
        let trace = Trace::open(scratch(), "a");
        trace.emit(Event::new("one"));
        trace.send(&mut Vec::new()).unwrap();
        trace.emit(Event::new("two"));

        let mut got = Vec::new();
        trace.send(&mut got).unwrap();
        assert_eq!(got.iter().map(|e| e.name.as_str()).collect::<Vec<_>>(), ["two"]);
    }

    #[test]
    fn a_refused_send_is_offered_again() {
        let trace = Trace::open(scratch(), "a");
        trace.emit(Event::new("one"));
        assert!(trace.send(&mut Refuses).is_err());

        let mut got = Vec::new();
        assert_eq!(trace.send(&mut got).unwrap(), 1);
    }

    #[test]
    fn a_line_not_yet_whole_waits() {
        let dir = scratch();
        let trace = Trace::open(&dir, "a");
        trace.emit(Event::new("one"));
        append(&dir.join("a.jsonl"), br#"{"at":1,"app":"a","#).unwrap();

        let mut got = Vec::new();
        assert_eq!(trace.send(&mut got).unwrap(), 1);
        append(&dir.join("a.jsonl"), br#""name":"two","fields":{}}"#.as_slice()).unwrap();
        append(&dir.join("a.jsonl"), b"\n").unwrap();
        assert_eq!(trace.send(&mut got).unwrap(), 1);
        assert_eq!(got[1].name, "two");
    }

    #[test]
    fn a_broken_line_is_stepped_over() {
        let dir = scratch();
        let trace = Trace::open(&dir, "a");
        append(&dir.join("a.jsonl"), b"not json\n").unwrap();
        trace.emit(Event::new("one"));

        let mut got = Vec::new();
        assert_eq!(trace.send(&mut got).unwrap(), 1);
        assert_eq!(trace.send(&mut got).unwrap(), 0);
    }

    #[test]
    fn a_file_sink_gathers_apps_into_one_file() {
        let dir = scratch();
        let all = dir.join("all.jsonl");
        for app in ["threads", "jobs"] {
            let trace = Trace::open(&dir, app);
            trace.emit(Event::new("opened"));
            trace.send(&mut FileSink::open(&all)).unwrap();
        }

        let text = fs::read_to_string(&all).unwrap();
        let apps: Vec<String> = text
            .lines()
            .map(|l| serde_json::from_str::<Event>(l).unwrap().app)
            .collect();
        assert_eq!(apps, ["threads", "jobs"]);
    }

    #[test]
    fn an_unwritable_folder_drops_and_counts() {
        let dir = scratch();
        fs::create_dir_all(dir.parent().unwrap()).unwrap();
        fs::write(&dir, "a file where the folder should be").unwrap();
        let trace = Trace::open(dir.join("inner"), "a");
        trace.emit(Event::new("one"));
        assert_eq!(trace.dropped(), 1);
        fs::remove_file(&dir).unwrap();
    }
}
