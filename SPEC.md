# phoneme

What phoneme is and what has been decided. `trace/`, `runtime/` and `lab/` are built; `trace/` is
in use in the suite.

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
| lab | runs, snapshots, the sweep runner | the reader over the apps and the events; runs in its database; formulations over the apps' data |
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
| **snapshot** | which data a run was trained and tested on, as a pointer: everything up to a moment, and a fingerprint of what that read gave |
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

Built. `runtime/`, crate `phoneme-runtime`: what an app links to use a model. Apps reach it
through morpheme, as they reach the trace.

```rust
let words = Embeddings::load(path)?;             // a pruned table: word -> vector, f16 on disk
let v: Option<Vec<f32>> = words.mean(text);      // tokenise, look up, mean-pool; None if no word is known
let mut builder = Builder::new(words.dim());     // label -> the mean of its examples' directions
builder.add("home", &v);
let head = builder.build(&words, prior);         // each label's own name counts as `prior` examples
let best: Option<Nearest> = head.nearest(&v);    // label, cosine, margin over the next
```

- **The builder is shared, so the lab's replay and the app build prototypes the same way.**

- **CPU only, and nothing used for training.** An app pulls in no burn autodiff and no dataset
  code. The first model is a table lookup and a mean, which needs no framework at all; burn's
  NDArray backend comes in with the first model that has layers (a learned projection, §7).
- **Loaded from a path.** Which path, and which version, is morpheme's (the `model` app).
- **The tokeniser is the lab's, byte for byte.** Lowercase, split on anything not a letter or
  digit, the same in training and in the app. One function, here, used by both.
- **Embeddings on disk:** `PHNMEMB1`, the dimension and word count as `u32`s, each word as a
  `u16` length and its bytes, then the vectors as f16, most frequent word first. So the first `n`
  words of a file are a smaller cut of it (`Embeddings::load_top`). GloVe 100d cut to the 50k most
  frequent words is about 10 MB.

---

## 6. lab

Built. `lab/`, crate `phoneme-lab`.

**A formulation owns its problem:** what it reads, how it builds its inputs, the model, what counts
as right, and how it's evaluated. There is no shared featurising by field type, and no fixed set of
task kinds. Each problem is posed on its own.

**Shared is only what every run needs, whatever it's about:**

```
read       where the data comes from        suite data (morpheme's reader), trace events,
                                            a public dataset, or nothing (a pretrained model)
snapshot   what it was, as a pointer        `until` and a fingerprint; the rows are never kept
run        formulation@version, snapshot,   one row per run; a sweep is many runs
           params, metrics
publish    the artifact, where apps get it  morpheme hands it to the `model` app
```

```rust
trait Formulation {
    const NAME: &str;
    const VERSION: u32;                    // bumped when what it reads or scores changes
    type Params: Serialize;
    fn read(&self, until: u64) -> Result<Snapshot>;   // its own query, up to `until`
    fn run(&self, data: &Snapshot, params: &Self::Params) -> Result<Metrics>;
}

trait Runs { fn record(&mut self, run: &Run) -> Result<()>; }   // a JSON-lines file here;
                                                                // morpheme's is its database
fn sweep<F: Formulation>(f: &F, data: &Snapshot, grid: impl Iterator<Item = F::Params>,
                         runs: &mut impl Runs) -> Result<Vec<Run>>;
```

- **A snapshot is a pointer, not a copy:** `until`, the moment the read covered everything up to,
  and a fingerprint (16 hex digits of the SHA-256 of the rows as read). The rows are held while
  the runs use them and never written anywhere, so data that grows doesn't pile up copies of
  itself. Reading an append-only source up to the same `until` again is the same data; a source
  whose records are edited may not be, and a different fingerprint says so.
- **Runs, like sinks, are a trait with a file behind it here.** Where morpheme keeps them is
  morpheme's.
- **Split by time.** Train on the past, test on the future. On personal data a random split leaks
  and flatters. A helper takes rows with a time and a cut and returns the two halves; which field
  is the time is the formulation's.
- **Metrics are the formulation's,** a flat map of name to number, so a sweep's runs compare side
  by side.
- **The sweep:** a `Grid` of named axes, crossed into parameters; one run per point, each recorded
  as it lands; `table` shows the parameters that differ between runs and every metric, sorted by
  the metric the caller names.
- **Vectors** (`vectors`): GloVe 6B fetched once, cut to its most frequent words as `.emb` files,
  and the download removed. `cut` reads GloVe's text and fastText's `.vec` alike.
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

**What it is:** a nearest-centroid classifier (Rocchio) over a frozen, pretrained encoder.
Supervised, since the categories are the labels, but fit in closed form: a prototype is an average,
so there's nothing to optimise and no burn. The name prior is a hyperparameter, a pseudo-count: a
Bayesian prior on each category's mean, centred on what its name means, worth `prior` examples.

**First result, on my threads** (morpheme §8): 45.8% top-1 against 42.2% for the last category
used. Not worth a prefill. The recency the text can't see is the next thing to add, with the first
learned weights, scored walk-forward.

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
- fastText vectors: `cut` reads them, nothing fetches them yet. They're 600 MB more, for words
  GloVe doesn't have.
