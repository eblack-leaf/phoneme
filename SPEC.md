# phoneme

What phoneme is and what has been decided, before most of it is written. `trace/` is built; the
rest is sketched here so the problems show up before the code does.

---

## 1. What it is

Where the models my apps use come from, and the public name for my ML work. Tiny deep learning:
models small enough to train and run on the device they serve, as part of how an app works rather
than a panel beside it.

- **It is** a trace for usage events, a runtime for running models (later), a lab for training
  them (later), and the site.
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
| lab | runs, snapshots, the sweep runner; sources are files | the viewer reader; formulations over the apps' cores |
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

- **Events are notifications, not data.** Nothing reads them to decide what is true. So `emit`
  can't fail the app: a line that can't be written is lost, and `dropped()` counts it.
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
formulation that needs what landed reads it through the viewer and joins it to the events.

**Problem found:** an event doesn't say which device it came from, and events from several devices
meet in one place. **Resolution:** the sink stamps it. It runs on the device and knows which one it
is; phoneme doesn't.

---

## 5. runtime

Not written. Load a model from a path and run it on CPU with burn's NDArray backend, as the phoneme
sweeps already do for inference. Apps depend on it the way they depend on datum, so it must pull in
nothing used for training. Where the path comes from (the `model` app, a version at a time) is
morpheme's.

---

## 6. lab

Not written, and not until a formulation exists to need it.

**A formulation owns its problem:** what it reads, how it builds its inputs, the model, what counts
as right, and how it's evaluated. There is no shared featurising by field type, and no fixed set of
task kinds. Each problem is posed on its own.

**Shared is only what every run needs, whatever it's about:**

```
read       where the data comes from        suite data (morpheme's viewer), trace events,
                                            a public dataset, or nothing (a pretrained model)
snapshot   what it was, frozen              a public dataset's is its file's hash
run        formulation@version, snapshot,   the sweep runner's results table, kept across time
           params, metrics
publish    the artifact, where apps get it  morpheme hands it to the `model` app
```

- **Split by time.** Train on the past, test on the future. On personal data a random split leaks
  and flatters.
- **Pull out what's shared after the second formulation, not before.** Until then, what repeats is
  a guess.

---

## 7. The first formulation: a thread's category

A candidate, to be measured rather than assumed.

- **Input:** a thread's text. **Output:** its category, prefilled on add when confident.
- **Encoder:** GloVe (or fastText, for words GloVe doesn't have) mean-pooled. In the sweeps,
  mean-pooling came within a point of KimCNN with under a thousand non-embedding parameters, and
  a thread is a few words.
- **Head: prototypes, not a softmax.** Categories get added, renamed, merged and deleted. A fixed
  output layer has an untrained neuron for every new one. A prototype is the mean of its threads'
  embeddings, with the category name's as a prior, so every change works at once. What words mean
  is pretrained; what my categories mean is data.
- **Events:** `thread.add` with the text, what was suggested (if anything), and what was chosen.
  The gap between the last two is the label and the feedback loop in one.

---

## 8. site

`site/` is the pages for the project: Solid and Vite, as before. It builds to `../docs`, which
GitHub Pages serves at `/phoneme/`.

```
cd site && npm run build
```

---

## 9. Order

1. **trace.** Done.
2. **A few `emit`s in threads**, sent to a file sink on the rig. Events only exist from the day
   they start being kept.
3. **morpheme**, with its SurrealDB sink, once events should gather from more than one device.
4. **The lab and the first formulation**, once there's data to train on.
5. **The runtime**, once a formulation earns a place in an app.

## 10. Open

- When an app sends: on close, beside its own sync, or on a press of its own.
- Whether the log needs rotating. An event is around a hundred bytes; measure before building it.
- Which events threads emits, beyond `thread.add`.
