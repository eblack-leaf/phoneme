# phoneme

What phoneme is and what has been decided. `trace/` is built and in use; the runtime and the lab
are specified here and not written.

---

## 1. What it is

Where the models my apps use come from, and the public name for my ML work. Tiny deep learning:
models small enough to train and run on the device they serve, as part of how an app works rather
than a panel beside it.

- **It is** a trace for usage events, a runtime for running models, a lab for training them, and
  the site.
- **It isn't** tied to my suite. Nothing here knows SurrealDB, datum, ops, or any app.

---

## 2. Public and private

The same split as foliage and the apps built on it. A phoneme is a unit of sound, and a morpheme
the smallest unit that means something: phoneme is the general part, morpheme is what it means
for my apps.

| | public: **phoneme** | private, on Forgejo: **morpheme** |
|---|---|---|
| trace | events, `emit`, `send`, the `Sink` trait, a file sink | a SurrealDB sink into its own ns/db, credentials through ops |
| runtime | load a model from a path, run it on CPU | find the path through the `model` app |
| lab | runs, snapshots, the sweep runner; sources are files | the reader over the apps and the events; runs in its database; formulations over the apps' data |
| formulations | public datasets | threads, jobs, usage patterns |

- **The rule.** Anything that names datum, ops, credentials, the `model` app or an app's types is
  morpheme's. Anything about events, models or runs in general is phoneme's.
- **The test.** A stranger can run every example here with files alone. An example that needs my
  network means something private has leaked in.

---

## 3. Words

| word | meaning |
|---|---|
| **event** | one thing that happened in an app, with the fields the app chose to put on it |
| **trace** | one app's events on one device: a log and how far into it has been sent |
| **sink** | where sent events go. The trace doesn't know what's behind it |
| **formulation** | one problem posed as ML: what it reads, how it builds inputs, the model, what counts as right |
| **snapshot** | the data a run was trained and tested on, frozen, so a result says what it came from |
| **run** | one formulation, one snapshot, one set of parameters, and what it scored |
| **artifact** | the trained model a run produced |

---

## 4. trace

Built. `trace/src/lib.rs`.

```rust
let trace = Trace::open(dir, "threads");                   // no I/O yet
trace.emit(Event::new("thread.add").set("category", "home"));   // appends a line, never fails the app
trace.send(&mut sink)?;                                    // when the app chooses
```

- **The app never reads its events; the lab does.** Nothing reads them to decide what is true in
  the app. So `emit` can't fail the app: a line that can't be written is lost, and `dropped()`
  counts it. For the lab, losing one is losing one example.
- **Append only.** `<app>.jsonl` beside `<app>.sent`, the byte offset `send` has reached. One
  write per line, so two processes emitting at once don't interleave.
- **Send is explicit, and nothing else.** No queue, no conflicts, no commit. At least once: a crash
  between the sink taking events and the mark moving offers them again. A line not yet whole waits
  for the next send; a line that won't parse is stepped over.
- **Apps instrument where they need to.** App schemas and datum don't change. Where a record's
  fields matter, the app emits them beside its `stage`, as plain values: the trace never sees a
  `Patch`.

**Problem found:** an event emitted beside a `stage` records what I did, not what landed. datum
can still refuse or discard the patch. **Resolution:** fine for usage ("I chose this"). A
formulation that needs what landed reads the records themselves and joins them to the events.

**Problem found:** an event doesn't say which device it came from, and events from several devices
meet in one place. **Resolution:** the sink stamps it. It runs on the device and knows which one it
is; phoneme doesn't.

---

## 5. runtime

Not written. `runtime/`, crate `phoneme-runtime`: what an app links to use a model. Apps reach it
through morpheme, as they reach the trace.

```rust
let words = Embeddings::load(path)?;          // a pruned table: word -> vector, f16 on disk
let v: Vec<f32> = words.mean(text);           // tokenise, look up, mean-pool; None-words skipped
let head = Prototypes::new(named_vectors);    // label -> mean vector, built by the caller
let best: Option<(label, score, margin)> = head.nearest(&v);
```

- **CPU only, and nothing used for training.** An app pulls in no burn autodiff and no dataset
  code. The first model is a table lookup and a mean, which needs no framework at all; burn's
  NDArray backend comes in with the first model that has layers (a learned projection, §7).
- **Loaded from a path.** Which path, and which version, is morpheme's (the `model` app).
- **The tokeniser is the lab's, byte for byte.** Lowercase, split on anything not a letter or
  digit, the same in training and in the app. One function, here, used by both.
- **Embeddings on disk:** a header (dimension, word count), the words, then the vectors as f16.
  GloVe 100d cut to the 50k most frequent words is about 10 MB.

---

## 6. lab

Not written. `lab/`, crate `phoneme-lab`.

**A formulation owns its problem:** what it reads, how it builds its inputs, the model, what counts
as right, and how it's evaluated. There is no shared featurising by field type, and no fixed set of
task kinds. Each problem is posed on its own.

**Shared is only what every run needs, whatever it's about:**

```
read       where the data comes from        suite data (morpheme's reader), trace events,
                                            a public dataset, or nothing (a pretrained model)
snapshot   what it was, frozen              rows as JSON lines in a file named by its hash
run        formulation@version, snapshot,   one row per run; a sweep is many runs
           params, metrics
publish    the artifact, where apps get it  morpheme hands it to the `model` app
```

```rust
trait Formulation {
    const NAME: &str;
    const VERSION: u32;                    // bumped when what it reads or scores changes
    type Params: Serialize;
    fn read(&self) -> Result<Snapshot>;    // the formulation's own query, frozen
    fn run(&self, data: &Snapshot, params: &Self::Params) -> Result<Metrics>;
}

trait Runs { fn record(&mut self, run: &Run) -> Result<()>; }   // a JSON-lines file here;
                                                                // morpheme's is its database
fn sweep<F: Formulation>(f: &F, data: &Snapshot, grid: impl Iterator<Item = F::Params>,
                         runs: &mut impl Runs) -> Result<Vec<Run>>;
```

- **A snapshot is a file,** `<hash>.jsonl`, the hash of its bytes. A run names its snapshot, so a
  result says exactly what it came from, and running again on the same file is the same run.
- **Runs, like sinks, are a trait with a file behind it here.** Where morpheme keeps them is
  morpheme's.
- **Split by time.** Train on the past, test on the future. On personal data a random split leaks
  and flatters. A helper takes rows with a time and a cut and returns the two halves; which field
  is the time is the formulation's.
- **Metrics are the formulation's,** a flat map of name to number, so a sweep's runs compare side
  by side.
- **The sweep runner is the one from the phoneme sweeps,** brought over: a grid, one run per point,
  the results table sorted by a metric the caller names.
- **Pull out what's shared after the second formulation, not before.** Until then, what repeats is
  a guess.

---

## 7. The first formulation: a thread's category

A candidate, to be measured rather than assumed. Where its data comes from and how it reaches the
app are morpheme's (its §8); the model is here.

- **Input:** a thread's text. **Output:** its category, prefilled on add when confident.
- **Encoder:** GloVe (or fastText, for words GloVe doesn't have) mean-pooled. In the sweeps,
  mean-pooling came within a point of KimCNN with under a thousand non-embedding parameters, and
  a thread is a few words.
- **Head: prototypes, not a softmax.** Categories get added, renamed, merged and deleted. A fixed
  output layer has an untrained neuron for every new one. A prototype is the mean of its threads'
  embeddings, with the category name's as a prior, so every change works at once. What words mean
  is pretrained; what my categories mean is data.
- **So the first artifact is only the embedding table.** The prototypes are built in the app from
  the threads it holds, every time they change. Nothing is trained on my data until the second
  version.
- **The second version learns a projection:** a small linear map over the GloVe vectors, trained
  with a contrastive loss so threads filed together sit closer. It never names a category, so it
  survives every change to them. Worth it only if it beats the first on the same split.

**Evaluated by replaying adds in time order.** For each thread, oldest first, prototypes are built
from the threads before it, and the prediction is scored against what it was filed under. That is
the situation the app is in at every add.

| metric | what |
|---|---|
| top-1 | the nearest prototype was the category |
| top-3 | it was among the three nearest (chips the form could put first) |
| coverage at τ | share of adds where the margin clears τ, and top-1 among those: the prefill's real rate |
| new | adds whose category didn't exist yet: the model can't be right, and should be unsure |

**Baselines, on the same replay:** the most common category so far; the most recent category used;
the category name prior alone. A model that doesn't beat "the last one I used" isn't worth a
prefill.

**Sweep:** embeddings (GloVe 50d, 100d, 300d; fastText), vocabulary cut (20k, 50k, 100k), name-prior
weight, τ.

---

## 8. site

`site/` is the pages for the project: Solid and Vite, as before. It builds to `../docs`, which
GitHub Pages serves at `/phoneme/`.

```
cd site && npm run build
```

---

## 9. Open

- Whether the log needs rotating. Most events are around a hundred bytes; jobs' capture events
  carry a whole page. Measure before building it.
- Where the embedding tables come from: downloaded once into the lab's data folder, and cut there.
  Whether the source files are kept or only the cuts.
