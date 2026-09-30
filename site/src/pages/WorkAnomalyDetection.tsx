export default function WorkAnomalyDetection() {
  return (
    <div
      class="bg-zinc-950 min-h-dvh text-stone-300"
      style='font-family: "JetBrains Mono", monospace;'
    >
      {/* Top nav */}
      <nav class="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-zinc-950/90 backdrop-blur">
        <a
          href="/phoneme/#anomaly"
          class="inline-flex items-center gap-2 text-stone-400 hover:text-orange-400 transition-colors text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to overview
        </a>
        <a
          href="https://github.com/eblack-leaf/auto-iot"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-1.5 text-stone-400 hover:text-orange-400 transition-colors text-sm"
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 7h10v10M7 17L17 7" />
          </svg>
        </a>
      </nav>

      <div class="max-w-4xl mx-auto px-6 py-12 lg:py-20 space-y-16">

        {/* Hero */}
        <header class="space-y-4">
          <p class="text-orange-800 text-xs tracking-widest uppercase">03 / Use Cases</p>
          <h1 class="text-orange-300 text-4xl sm:text-5xl font-bold tracking-tight">
            Anomaly Detection
          </h1>
          <p class="text-stone-400 text-lg leading-relaxed max-w-2xl">
            Lightweight autoencoder-based anomaly detection for IoT and edge devices
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            {["autoencoder", "unsupervised", "rust", "burn", "wgpu", "edge-ml"].map(tag => (
              <span class="px-2.5 py-1 text-xs border border-stone-700 text-stone-500 rounded">
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Architecture */}
        <section class="space-y-6">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Architecture</h2>
          <div class="border border-stone-800 rounded-lg p-4 bg-zinc-900/40">
            <svg viewBox="-12 0 512 250" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Input sensors */}
              {[50,82,114,146,178].map(y => <circle cx="28" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="28" y="207" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">sensor x</text>
              {/* → encoder layer 1 */}
              {[50,82,114,146,178].map(y => (
                <g>
                  <line x1="36" y1={y} x2="96" y2="96"  stroke="#44403c" stroke-width="0.8" />
                  <line x1="36" y1={y} x2="96" y2="114" stroke="#44403c" stroke-width="0.8" />
                  <line x1="36" y1={y} x2="96" y2="132" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[96,114,132].map(y => <circle cx="104" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              {/* → encoder layer 2 */}
              {[96,114,132].map(y => (
                <g>
                  <line x1="112" y1={y} x2="162" y2="106" stroke="#44403c" stroke-width="0.8" />
                  <line x1="112" y1={y} x2="162" y2="122" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[106,122].map(y => <circle cx="170" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="114" y="172" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">encoder</text>
              {/* → bottleneck — orange accent */}
              <line x1="178" y1="106" x2="224" y2="114" stroke="#44403c" stroke-width="0.8" />
              <line x1="178" y1="122" x2="224" y2="114" stroke="#44403c" stroke-width="0.8" />
              <circle cx="236" cy="114" r="15" fill="none" stroke="#f97316" stroke-width="2" />
              <text x="236" y="120" text-anchor="middle" fill="#f97316" font-size="14" font-family="JetBrains Mono, monospace">z</text>
              <text x="236" y="90" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">latent</text>
              {/* decoder layer 1 */}
              <line x1="250" y1="107" x2="292" y2="106" stroke="#44403c" stroke-width="0.8" />
              <line x1="250" y1="121" x2="292" y2="122" stroke="#44403c" stroke-width="0.8" />
              {[106,122].map(y => <circle cx="300" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              {/* decoder layer 2 */}
              {[106,122].map(y => (
                <g>
                  <line x1="308" y1={y} x2="356" y2="96"  stroke="#44403c" stroke-width="0.8" />
                  <line x1="308" y1={y} x2="356" y2="114" stroke="#44403c" stroke-width="0.8" />
                  <line x1="308" y1={y} x2="356" y2="132" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[96,114,132].map(y => <circle cx="364" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="334" y="172" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">decoder</text>
              {/* → reconstruction */}
              {[96,114,132].map(y => (
                <g>
                  <line x1="372" y1={y} x2="424" y2="50"  stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="82"  stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="114" stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="146" stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="178" stroke="#44403c" stroke-width="0.7" />
                </g>
              ))}
              {[50,82,114,146,178].map(y => <circle cx="432" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="432" y="207" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">x̂ recon.</text>
              <text x="250" y="233" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">anomaly score = ‖x − x̂‖²</text>
            </svg>
          </div>
        </section>

        {/* Metrics */}
        <section class="space-y-6">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Metrics</h2>
          <p class="text-stone-500 text-sm max-w-2xl">
            Best result from grid search on nab-machine (400 epochs, batch 512, clean training).
            Composite score = AUROC×0.6 + val_loss×0.25 + params×0.15.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="border border-stone-800 rounded-lg p-6 flex flex-col gap-2 bg-zinc-900/40">
              <span class="text-stone-500 text-sm">AUC-ROC</span>
              <span class="text-orange-300 text-2xl font-bold">0.9976</span>
            </div>
            <div class="border border-stone-800 rounded-lg p-6 flex flex-col gap-2 bg-zinc-900/40">
              <span class="text-stone-500 text-sm">model size</span>
              <span class="text-orange-300 text-2xl font-bold">5 264 params</span>
              <span class="text-stone-600 text-xs">~21 KB f32</span>
            </div>
            <div class="border border-stone-800 rounded-lg p-6 flex flex-col gap-2 bg-zinc-900/40">
              <span class="text-stone-500 text-sm">composite score</span>
              <span class="text-orange-300 text-2xl font-bold">0.9551</span>
              <span class="text-stone-600 text-xs">shallow · latent=16 · hidden=32</span>
            </div>
          </div>
        </section>

        {/* Detail */}
        <section class="space-y-4 text-stone-400 text-base leading-relaxed max-w-2xl">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Detail</h2>
          <p>
            Autoencoders are trained entirely on your local machine — no cloud, no CUDA required.
            WGPU provides GPU acceleration across Vulkan, Metal, and DX12 with a software fallback.
          </p>
          <p>
            The core insight is <span class="text-stone-300">clean training</span>: the model sees
            only normal samples during training, forcing the bottleneck to generalise the normal
            manifold. At inference time, anomalies produce high reconstruction error because
            the learned encoding has no way to represent them. No labels required during training —
            reconstruction error is the anomaly signal.
          </p>
          <p class="text-stone-500">
            A grid search over 36 configurations (2 architectures × 2 learning rates × 3 latent
            dims × 3 hidden dims) finds the smallest model that achieves strong AUROC.
            The recommended edge deployment is the shallow autoencoder at latent=16, hidden=32 —
            5 264 parameters, ~21 KB in f32, converging in ~200–350 epochs.
          </p>
        </section>

        {/* Architectures */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Architectures</h2>
          <p class="text-stone-500 text-sm max-w-2xl">
            ReLU activations in hidden layers, Sigmoid on output to match MinMax-normalised inputs.
            Bottleneck must be tight — 3–10% of input dim keeps the model from memorising anomalies.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px border border-stone-800 rounded-lg overflow-hidden">
            {[
              ["shallow", "input → hidden → latent → hidden → output", "Fastest, fewest params. Top composite score on nab-machine."],
              ["deep",    "input → H → H/2 → latent → H/2 → H → output", "Better capacity. Highest raw AUROC (0.9995) without clean training."],
            ].map(([name, layers, note]) => (
              <div class="flex flex-col gap-2 px-4 py-4 bg-zinc-900/40">
                <span class="text-stone-300 text-sm font-semibold">{name}</span>
                <span class="font-mono text-xs text-stone-500">{layers}</span>
                <span class="text-xs text-stone-600">{note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Datasets */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Datasets</h2>
          <p class="text-stone-500 text-sm max-w-2xl">
            All labels follow the same convention: <span class="text-stone-400 font-mono">0 = normal</span>,{" "}
            <span class="text-orange-700 font-mono">1 = anomaly</span>.
            Sequence length is configurable via a sliding window.
          </p>
          <div class="grid grid-cols-1 gap-px border border-stone-800 rounded-lg overflow-hidden">
            {[
              ["nab-machine", "IoT machine temperature", "Numenta NAB — real-world industrial sensor data with labeled fault events"],
              ["nab-taxi",    "NYC taxi passengers",     "Numenta NAB — demand time series with anomalous spikes and dropouts"],
              ["synthetic",   "Gaussian + outliers",     "Generated in-memory. Seeded (StdRng 42) for full reproducibility"],
            ].map(([name, domain, note]) => (
              <div class="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 px-4 py-3 bg-zinc-900/40">
                <span class="font-mono text-xs text-stone-400 sm:w-28 shrink-0">{name}</span>
                <span class="text-xs text-stone-500 sm:w-44 shrink-0">{domain}</span>
                <span class="text-xs text-stone-600">{note}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Model size */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Edge Footprints</h2>
          <p class="text-stone-500 text-sm max-w-2xl">
            Approximate parameter counts and RAM for window-64 inputs (f32).
            Every training run prints live parameter count and footprint for direct comparison.
          </p>
          <div class="grid grid-cols-1 gap-px border border-stone-800 rounded-lg overflow-hidden">
            {[
              ["shallow", "32",  "4",  "~9 K",  "~36 KB"],
              ["shallow", "64",  "8",  "~18 K", "~72 KB"],
              ["shallow", "128", "16", "~54 K", "~216 KB"],
              ["deep",    "64",  "8",  "~30 K", "~120 KB"],
              ["deep",    "128", "16", "~95 K", "~380 KB"],
            ].map(([arch, hidden, latent, params, ram]) => (
              <div class="grid grid-cols-5 px-4 py-2.5 bg-zinc-900/40 text-xs">
                <span class="text-stone-400 font-mono">{arch}</span>
                <span class="text-stone-600">hidden={hidden}</span>
                <span class="text-stone-600">latent={latent}</span>
                <span class="text-stone-500">{params}</span>
                <span class="text-stone-600">{ram}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Stack</h2>
          <div class="flex flex-wrap gap-2">
            {["Rust 1.75+", "Burn 0.20.1", "WGPU", "Adam", "clap", "bhtsne", "reqwest"].map(item => (
              <span class="px-3 py-1.5 text-xs border border-stone-800 text-stone-500 rounded font-mono bg-zinc-900/40">
                {item}
              </span>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
