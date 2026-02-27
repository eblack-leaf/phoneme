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
          href="https://github.com/placeholder/text-classification"
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
          <p class="text-orange-800 text-xs tracking-widest uppercase">02 / Use Cases</p>
          <h1 class="text-orange-300 text-4xl sm:text-5xl font-bold tracking-tight">
            Text Classification
          </h1>
          <p class="text-stone-400 text-lg leading-relaxed max-w-2xl">
            On-device Conv1D pipeline for token intent detection
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            {["nlp", "conv1d", "on-device", "rust"].map(tag => (
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
            <svg viewBox="0 0 515 230" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Embedding */}
              <rect x="10" y="72" width="58" height="86" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="39" y="112" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">embed</text>
              <text x="39" y="129" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">dim 64</text>
              <text x="39" y="54" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">tokens</text>
              <line x1="68" y1="115" x2="90" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Conv1D ×2 */}
              <rect x="90" y="58" width="62" height="114" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="121" y="110" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="121" y="127" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=3×128</text>
              <text x="121" y="40" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">ReLU</text>
              <line x1="152" y1="115" x2="174" y2="115" stroke="#44403c" stroke-width="1" />
              <rect x="174" y="70" width="62" height="90" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="205" y="110" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="205" y="127" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=5×64</text>
              <text x="205" y="52" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">ReLU</text>
              <line x1="236" y1="115" x2="258" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Global max pool — orange accent */}
              <rect x="258" y="90" width="66" height="50" rx="5" fill="none" stroke="#f97316" stroke-width="2" />
              <text x="291" y="112" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">global</text>
              <text x="291" y="128" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">max pool</text>
              <line x1="324" y1="115" x2="346" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Dense */}
              <rect x="346" y="96" width="54" height="38" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="373" y="121" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">dense</text>
              <line x1="400" y1="115" x2="422" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Output classes */}
              {[88,115,142].map(y => <circle cx="436" cy={y} r="11" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <line x1="422" y1="115" x2="425" y2="88"  stroke="#44403c" stroke-width="1" />
              <line x1="422" y1="115" x2="425" y2="142" stroke="#44403c" stroke-width="1" />
              <text x="457" y="92"  fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">spam</text>
              <text x="457" y="119" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">intent</text>
              <text x="457" y="146" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">other</text>
            </svg>
          </div>
        </section>

        {/* Metrics */}
        <section class="space-y-6">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Metrics</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">accuracy</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">F1 score</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">inference latency (ms)</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
          </div>
        </section>

        {/* Detail */}
        <section class="space-y-4 text-stone-400 text-base leading-relaxed max-w-2xl">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Detail</h2>
          <p>
            Small CNN for local intent detection and spam filtering.
            Runs entirely on-device — no data leaves, no cloud inference.
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
