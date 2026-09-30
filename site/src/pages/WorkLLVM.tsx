export default function WorkLLVM() {
  return (
    <div
      class="bg-zinc-950 min-h-dvh text-stone-300"
      style='font-family: "JetBrains Mono", monospace;'
    >
      {/* Top nav */}
      <nav class="sticky top-0 z-20 flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-zinc-950/90 backdrop-blur">
        <a
          href="/phoneme/#llvm"
          class="inline-flex items-center gap-2 text-stone-400 hover:text-orange-400 transition-colors text-sm"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to overview
        </a>
        <a
          href="https://github.com/eblack-leaf/llvm-lstm"
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
          <p class="text-orange-800 text-xs tracking-widest uppercase">01 / Use Cases</p>
          <h1 class="text-orange-300 text-4xl sm:text-5xl font-bold tracking-tight">
            LLVM Pass Ordering
          </h1>
          <p class="text-stone-400 text-lg leading-relaxed max-w-2xl">
            LSTM + PPO reinforcement learning for compiler pass selection
          </p>
          <div class="flex flex-wrap gap-2 pt-2">
            {["reinforcement-learning", "llvm", "rust"].map(tag => (
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
            <svg viewBox="-12 0 512 270" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Input features */}
              {[90,120,150,180].map(y => <circle cx="40" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="40" y="212" text-anchor="middle" fill="#78716c" font-size="14" font-family="JetBrains Mono, monospace">IR features</text>
              {/* → LSTM */}
              {[90,120,150,180].map(y => <line x1="49" y1={y} x2="138" y2="135" stroke="#44403c" stroke-width="1" />)}
              {/* LSTM cell */}
              <rect x="140" y="98" width="100" height="68" rx="6" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="190" y="130" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">LSTM</text>
              <text x="190" y="152" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">hidden: 64</text>
              {/* Recurrence */}
              <path d="M240 118 Q265 118 265 90 Q265 62 190 62 Q140 62 140 108" fill="none" stroke="#78716c" stroke-width="1" stroke-dasharray="4 3" />
              <polygon points="140,106 136,96 146,96" fill="#78716c" />
              {/* → heads */}
              <line x1="240" y1="115" x2="303" y2="90" stroke="#44403c" stroke-width="1" />
              <line x1="240" y1="151" x2="303" y2="175" stroke="#44403c" stroke-width="1" />
              {/* Policy head */}
              <circle cx="318" cy="87" r="17" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="318" y="93" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">π</text>
              <text x="318" y="62" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">policy</text>
              {/* Value head */}
              <circle cx="318" cy="178" r="17" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="318" y="185" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">V</text>
              <text x="318" y="213" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">value</text>
              {/* → pass selection */}
              <line x1="335" y1="87"  x2="398" y2="118" stroke="#44403c" stroke-width="1" />
              <line x1="335" y1="178" x2="398" y2="148" stroke="#44403c" stroke-width="1" />
              <rect x="398" y="112" width="90" height="44" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="443" y="131" text-anchor="middle" fill="#a8a29e" font-size="15" font-family="JetBrains Mono, monospace">pass</text>
              <text x="443" y="150" text-anchor="middle" fill="#a8a29e" font-size="15" font-family="JetBrains Mono, monospace">select</text>
              {/* Reward feedback — orange accent */}
              <path d="M443 156 Q443 242 190 242 Q140 242 140 170" fill="none" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 3" />
              <polygon points="140,168 136,178 146,178" fill="#f97316" />
              <text x="310" y="259" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">reward: Δspeedup vs -O3</text>
            </svg>
          </div>
        </section>

        {/* Metrics */}
        <section class="space-y-6">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Metrics</h2>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">speedup vs -O3</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">convergence (steps)</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
            <div class="border border-dashed border-stone-700 rounded-lg p-6 flex flex-col gap-2">
              <span class="text-stone-500 text-sm">policy entropy</span>
              <span class="text-stone-600 text-2xl font-bold">—</span>
            </div>
          </div>
        </section>

        {/* Detail */}
        <section class="space-y-4 text-stone-400 text-base leading-relaxed max-w-2xl">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Detail</h2>
          <p>
            Modern compilers apply optimization passes in a fixed order determined
            by <span class="text-stone-300">-O2</span>/<span class="text-stone-300">-O3</span> flags.
            This project treats pass selection as a sequential decision problem: an LSTM
            policy trained with PPO observes IR features after each applied pass and selects
            the next optimization to maximize runtime speedup.
          </p>
          <p>
            The agent operates episodically — observe current IR features, select a pass
            (or STOP), apply it via <span class="text-stone-300 font-mono text-sm">opt-20</span>,
            re-extract features, receive a reward proportional to speedup over the
            <span class="text-stone-300"> -O3</span> baseline. No labeled data;
            the compiler and hardware are the oracle.
          </p>
          <p class="text-stone-500">
            PPO clips the policy gradient for stable updates. The LSTM carries context
            across the pass sequence. IR features are extracted by fast text-parsing of
            <span class="font-mono text-sm"> .ll</span> files (&lt;50ms per file).
          </p>
        </section>

        {/* Action Space */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Action Space</h2>
          <p class="text-stone-500 text-sm leading-relaxed max-w-2xl">
            28 high-impact transforms from LLVM's <span class="text-stone-400">-O3</span> inner
            kernel + a STOP action (29 total). An extended set of 86 actions adds interprocedural
            and module-level passes via a feature flag.
          </p>
          <div class="border border-stone-800 rounded-lg p-4 bg-zinc-900/40 font-mono text-xs text-stone-500 leading-relaxed">
            <span class="text-stone-400">instcombine</span>, <span class="text-stone-400">inline</span>, <span class="text-stone-400">loop-unroll</span>, <span class="text-stone-400">licm</span>, <span class="text-stone-400">gvn</span>, <span class="text-stone-400">sroa</span>, <span class="text-stone-400">mem2reg</span>, <span class="text-stone-400">simplifycfg</span>, <span class="text-stone-400">dse</span>, <span class="text-stone-400">reassociate</span>,{" "}
            <span class="text-stone-400">jump-threading</span>, <span class="text-stone-400">loop-rotate</span>, <span class="text-stone-400">adce</span>, <span class="text-stone-400">early-cse</span>, <span class="text-stone-400">tailcallelim</span>, <span class="text-stone-400">loop-vectorize</span>, <span class="text-stone-400">slp-vectorize</span>, <span class="text-stone-400">sccp</span>,{" "}
            <span class="text-stone-400">correlated-propagation</span>, <span class="text-stone-400">loop-idiom</span>, <span class="text-stone-400">indvars</span>, <span class="text-stone-400">aggressive-instcombine</span>, <span class="text-stone-400">mldst-motion</span>, <span class="text-stone-400">newgvn</span>,{" "}
            <span class="text-stone-400">loop-deletion</span>, <span class="text-stone-400">merge-func</span>, <span class="text-stone-400">div-rem-pairs</span> + <span class="text-orange-700">STOP</span>
          </div>
        </section>

        {/* IR Features */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">IR Feature Vector</h2>
          <p class="text-stone-500 text-sm max-w-2xl">18-dimensional observation extracted per function from LLVM IR text.</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px border border-stone-800 rounded-lg overflow-hidden">
            {[
              ["add_count", "add/fadd/sub/fsub instructions"],
              ["mul_count", "mul/div/rem variants"],
              ["load_count", "load instructions"],
              ["store_count", "store instructions"],
              ["br_count", "branch/switch instructions"],
              ["call_count", "call/invoke instructions"],
              ["phi_count", "phi nodes"],
              ["alloca_count", "stack allocations"],
              ["gep_count", "getelementptr instructions"],
              ["icmp_count", "integer comparisons"],
              ["fcmp_count", "float comparisons"],
              ["ret_count", "return instructions"],
              ["other_inst_count", "all other instructions"],
              ["basic_block_count", "total basic blocks"],
              ["total_instruction_count", "all instructions"],
              ["function_count", "defined functions"],
              ["loop_depth_approx", "back-edge count (loop proxy)"],
              ["load_store_ratio", "load/store ratio"],
            ].map(([name, desc]) => (
              <div class="flex gap-3 px-4 py-2.5 bg-zinc-900/40">
                <span class="font-mono text-xs text-stone-400 w-44 shrink-0">{name}</span>
                <span class="text-xs text-stone-600">{desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Benchmarks */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Benchmarks</h2>
          <p class="text-stone-500 text-sm max-w-2xl">
            32 self-contained C programs. Each measures its own execution time with{" "}
            <span class="font-mono text-stone-400 text-xs">clock_gettime</span> and reports
            the median over multiple iterations.
          </p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-px border border-stone-800 rounded-lg overflow-hidden">
            {[
              ["Linear algebra", "dot_product, matrix_multiply_tiled, convolution, stencil2d"],
              ["Sorting / searching", "mergesort, quicksort, binary_search, kmp_search"],
              ["Data structures", "binary_tree, hashtable, heap_ops"],
              ["Algorithms", "fft, karatsuba, levenshtein, nqueens, lz_compress"],
              ["Misc", "miniray, physics_sim, trig_approx, interpreter, regex_match"],
            ].map(([cat, examples]) => (
              <div class="flex flex-col gap-1 px-4 py-3 bg-zinc-900/40">
                <span class="text-xs text-stone-400">{cat}</span>
                <span class="text-xs text-stone-600 font-mono">{examples}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Stack */}
        <section class="space-y-4">
          <h2 class="text-stone-200 text-xl font-semibold tracking-tight">Stack</h2>
          <div class="flex flex-wrap gap-2">
            {["Rust 1.75+", "LLVM 20", "burn (NDArray)", "rayon", "PPO", "LSTM"].map(item => (
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
