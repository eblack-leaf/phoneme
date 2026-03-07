export default function WorkTextClassification() {
  return (
    <div
      class="bg-zinc-950 min-h-dvh text-stone-300"
      style='font-family: "JetBrains Mono", monospace;'
    >
      {/* Top nav */}
      <nav class="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-zinc-950/90 backdrop-blur">
        <a
          href="/phoneme/#text-classification"
          class="inline-flex items-center gap-2 text-stone-400 hover:text-orange-400 transition-colors text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to overview
        </a>
        <a
          href="https://github.com/eblack-leaf/cnn-text"
          class="inline-flex items-center gap-1.5 text-stone-400 hover:text-orange-400 transition-colors text-sm"
          target="_blank"
          rel="noopener noreferrer"
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
          <p class="text-orange-800 text-xs tracking-widest uppercase">02 / Use Cases</p>
          <h1 class="text-orange-300 text-4xl sm:text-5xl font-bold tracking-tight">
            Text Classification
          </h1>
          <p class="text-stone-400 text-lg leading-relaxed max-w-2xl">
            On-device Kim-CNN pipeline for text intent detection
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            {["nlp", "kim-cnn", "glove-100d", "on-device", "rust"].map(tag => (
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
            <svg viewBox="0 0 560 295" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Embedding (tall, spans all 3 rows) */}
              <text x="36" y="17" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">tokens</text>
              <rect x="8" y="25" width="56" height="245" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="36" y="140" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">embed</text>
              <text x="36" y="157" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">GloVe</text>
              <text x="36" y="172" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">100d</text>
              {/* Branch lines: embed → 3 convs */}
              <line x1="64" y1="147" x2="90" y2="65" stroke="#44403c" stroke-width="1" />
              <line x1="64" y1="147" x2="90" y2="147" stroke="#44403c" stroke-width="1" />
              <line x1="64" y1="147" x2="90" y2="232" stroke="#44403c" stroke-width="1" />
              {/* Conv k=3 */}
              <text x="122" y="25" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">ReLU</text>
              <rect x="90" y="40" width="65" height="50" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="122" y="62" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="122" y="79" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=3</text>
              {/* Conv k=4 */}
              <rect x="90" y="122" width="65" height="50" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="122" y="144" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="122" y="161" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=4</text>
              {/* Conv k=5 */}
              <rect x="90" y="207" width="65" height="50" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="122" y="229" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="122" y="246" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=5</text>
              {/* Lines: convs → max pools */}
              <line x1="155" y1="65"  x2="170" y2="65"  stroke="#44403c" stroke-width="1" />
              <line x1="155" y1="147" x2="170" y2="147" stroke="#44403c" stroke-width="1" />
              <line x1="155" y1="232" x2="170" y2="232" stroke="#44403c" stroke-width="1" />
              {/* Max pool k=3 */}
              <rect x="170" y="45" width="54" height="40" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="197" y="62"  text-anchor="middle" fill="#a8a29e" font-size="13" font-family="JetBrains Mono, monospace">max</text>
              <text x="197" y="77"  text-anchor="middle" fill="#78716c" font-size="12" font-family="JetBrains Mono, monospace">pool</text>
              {/* Max pool k=4 */}
              <rect x="170" y="127" width="54" height="40" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="197" y="144" text-anchor="middle" fill="#a8a29e" font-size="13" font-family="JetBrains Mono, monospace">max</text>
              <text x="197" y="159" text-anchor="middle" fill="#78716c" font-size="12" font-family="JetBrains Mono, monospace">pool</text>
              {/* Max pool k=5 */}
              <rect x="170" y="212" width="54" height="40" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="197" y="229" text-anchor="middle" fill="#a8a29e" font-size="13" font-family="JetBrains Mono, monospace">max</text>
              <text x="197" y="244" text-anchor="middle" fill="#78716c" font-size="12" font-family="JetBrains Mono, monospace">pool</text>
              {/* Converging lines → concat */}
              <line x1="224" y1="65"  x2="244" y2="147" stroke="#44403c" stroke-width="1" />
              <line x1="224" y1="147" x2="244" y2="147" stroke="#44403c" stroke-width="1" />
              <line x1="224" y1="232" x2="244" y2="147" stroke="#44403c" stroke-width="1" />
              {/* Concat — orange accent */}
              <rect x="244" y="120" width="55" height="54" rx="5" fill="none" stroke="#f97316" stroke-width="2" />
              <text x="271" y="144" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">concat</text>
              <text x="271" y="162" text-anchor="middle" fill="#f97316" font-size="12" font-family="JetBrains Mono, monospace">×3</text>
              {/* Dense + dropout */}
              <line x1="299" y1="147" x2="314" y2="147" stroke="#44403c" stroke-width="1" />
              <rect x="314" y="127" width="62" height="40" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="345" y="145" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">dense</text>
              <text x="345" y="160" text-anchor="middle" fill="#78716c" font-size="12" font-family="JetBrains Mono, monospace">dropout</text>
              {/* Output classes */}
              <line x1="376" y1="147" x2="396" y2="147" stroke="#44403c" stroke-width="1" />
              <line x1="396" y1="147" x2="399" y2="120" stroke="#44403c" stroke-width="1" />
              <line x1="396" y1="147" x2="399" y2="174" stroke="#44403c" stroke-width="1" />
              {[120, 147, 174].map(y => <circle cx="412" cy={y} r="11" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="433" y="124" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">spam</text>
              <text x="433" y="151" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">intent</text>
              <text x="433" y="178" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">other</text>
            </svg>
          </div>
        </section>

        {/* Metrics */}
        <section class="space-y-6">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Metrics</h2>
          <div class="border border-stone-800 rounded-lg overflow-hidden">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-stone-800 text-stone-500">
                  <th class="text-left px-4 py-3 font-normal">dataset</th>
                  <th class="text-right px-4 py-3 font-normal">accuracy</th>
                  <th class="text-right px-4 py-3 font-normal">macro F1</th>
                  <th class="text-right px-4 py-3 font-normal">latency (ms)</th>
                  <th class="text-right px-4 py-3 font-normal hidden sm:table-cell">val n</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { dataset: "SMS Spam",  acc: "99.16%", f1: "0.9824", lat: "0.26", n: "836"    },
                  { dataset: "IMDB",      acc: "89.96%", f1: "0.8996", lat: "0.27", n: "7,500"  },
                  { dataset: "AG News",   acc: "93.12%", f1: "0.9312", lat: "0.41", n: "19,140" },
                ].map((row, i, arr) => (
                  <tr class={i < arr.length - 1 ? "border-b border-stone-800/60" : ""}>
                    <td class="px-4 py-3 text-stone-300">{row.dataset}</td>
                    <td class="px-4 py-3 text-right text-orange-300 font-mono">{row.acc}</td>
                    <td class="px-4 py-3 text-right text-orange-300 font-mono">{row.f1}</td>
                    <td class="px-4 py-3 text-right text-orange-300 font-mono">{row.lat}</td>
                    <td class="px-4 py-3 text-right text-stone-600 font-mono hidden sm:table-cell">{row.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p class="px-4 py-2 text-xs text-stone-700 border-t border-stone-800">median forward latency · batch=1 · CPU</p>
          </div>
        </section>

        {/* Detail */}
        <section class="space-y-4 text-stone-400 text-base leading-relaxed max-w-2xl">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Detail</h2>
          <p>
            Kim-CNN with GloVe 100d embeddings for local intent detection and spam filtering.
            Parallel conv branches (k=3, 4, 5) capture n-gram features at multiple scales,
            pooled and concatenated before classification. Runs entirely on-device — no data leaves, no cloud inference.
          </p>
          <p class="text-stone-500">
            Fine-tune on user-specific patterns without exfiltrating training data.
            The model lives on the device; so does everything it learns.
          </p>
        </section>

      </div>
    </div>
  );
}
