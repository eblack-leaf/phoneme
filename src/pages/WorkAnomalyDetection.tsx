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
          href="https://github.com/placeholder/anomaly-detection"
          class="inline-flex items-center gap-1.5 text-stone-600 text-sm cursor-not-allowed select-none"
          tabindex="-1"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
        >
          GitHub
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M7 7h10v10M7 17L17 7" />
          </svg>
          <span class="text-xs text-stone-700">(soon)</span>
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
            Autoencoder for unsupervised sensor anomaly detection
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            {["autoencoder", "unsupervised", "rust"].map(tag => (
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
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">AUC-ROC</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">reconstruction error threshold</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">false positive rate</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
          </div>
        </section>

        {/* Detail */}
        <section class="space-y-4 text-stone-400 text-base leading-relaxed max-w-2xl">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Detail</h2>
          <p>
            Autoencoder trained on-device for edge IoT. Learns normal sensor patterns
            during a calibration window, then flags deviations in real-time.
          </p>
          <p class="text-stone-500">
            No labeled data required — reconstruction error is the anomaly signal.
            Works on any time-series sensor: vibration, temperature, current draw.
          </p>
        </section>

      </div>
    </div>
  );
}
