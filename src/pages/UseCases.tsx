import { A } from "@solidjs/router";

export default function UseCases() {
  return (
    <div class="relative min-h-screen w-full bg-zinc-950 flex flex-col items-center justify-center px-6 py-20">
      {/* Up chevron — back to home */}
      <A
        href="/"
        class="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity"
        style="z-index: 10;"
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="text-amber-400"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
        <span
          class="text-amber-400 text-sm tracking-[0.2em] uppercase"
          style='font-family: "JetBrains Mono", monospace;'
        >
          Back
        </span>
      </A>

      <h2
        class="text-orange-400 text-2xl sm:text-3xl font-bold tracking-tight mb-16 text-center"
        style='font-family: "JetBrains Mono", monospace;'
      >
        USE CASES
      </h2>

      <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div>
          <div
            class="border border-orange-900/40 rounded-lg p-6 bg-zinc-950/80"
            style='font-family: "JetBrains Mono", monospace;'
          >
            {/* LSTM + PPO diagram */}
            <svg viewBox="0 0 220 140" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
              {/* Input nodes */}
              <circle cx="30" cy="35" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="30" cy="60" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="30" cy="85" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="30" y="108" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">IR feat.</text>

              {/* Connections input → LSTM */}
              <line x1="35" y1="35" x2="63" y2="50" stroke="#44403c" stroke-width="0.8" />
              <line x1="35" y1="60" x2="63" y2="60" stroke="#44403c" stroke-width="0.8" />
              <line x1="35" y1="85" x2="63" y2="70" stroke="#44403c" stroke-width="0.8" />

              {/* LSTM cell */}
              <rect x="65" y="42" width="40" height="35" rx="4" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="85" y="64" text-anchor="middle" fill="#a8a29e" font-size="10" font-family="JetBrains Mono, monospace">LSTM</text>
              {/* Recurrence arrow */}
              <path d="M105 55 Q115 55 115 42 Q115 25 85 25 Q65 25 65 45" fill="none" stroke="#78716c" stroke-width="0.8" />
              <polygon points="65,43 62,37 68,37" fill="#78716c" />

              {/* Connections LSTM → heads */}
              <line x1="105" y1="52" x2="130" y2="42" stroke="#44403c" stroke-width="0.8" />
              <line x1="105" y1="68" x2="130" y2="80" stroke="#44403c" stroke-width="0.8" />

              {/* Policy head */}
              <circle cx="135" cy="42" r="8" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="135" y="46" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">π</text>
              <text x="135" y="26" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">policy</text>

              {/* Value head */}
              <circle cx="135" cy="80" r="8" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="135" y="84" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">V</text>
              <text x="135" y="100" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">value</text>

              {/* Arrow to action */}
              <line x1="143" y1="42" x2="163" y2="58" stroke="#44403c" stroke-width="0.8" />
              <line x1="143" y1="80" x2="163" y2="64" stroke="#44403c" stroke-width="0.8" />
              <rect x="163" y="50" width="48" height="22" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="187" y="65" text-anchor="middle" fill="#a8a29e" font-size="8" font-family="JetBrains Mono, monospace">pass sel.</text>
            </svg>

            <h3 class="text-orange-300 text-sm font-bold mb-2">LLVM Pass Optimization</h3>
            <p class="text-stone-500 text-xs leading-relaxed mb-3">
              LSTM + PPO online learning. Input: IR features extracted per function.
              Reward signal: measured speedup vs. <span class="text-stone-400">-O3</span>. Learns a
              per-program pass ordering policy on-device.
            </p>
            <A
              href="/work/llvm"
              class="inline-flex items-center gap-1.5 text-orange-600 text-xs hover:text-orange-400 transition-colors"
            >
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </A>
          </div>
        </div>

        {/* Card 2 */}
        <div>
          <div
            class="border border-orange-900/40 rounded-lg p-6 bg-zinc-950/80"
            style='font-family: "JetBrains Mono", monospace;'
          >
            {/* Text classifier diagram */}
            <svg viewBox="0 0 220 150" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
              {/* Embedding block */}
              <rect x="8" y="40" width="35" height="45" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="25" y="67" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">embed</text>

              {/* Arrow */}
              <line x1="43" y1="62" x2="55" y2="62" stroke="#44403c" stroke-width="0.8" />

              {/* Conv1D layer 1 */}
              <rect x="55" y="35" width="32" height="55" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="71" y="59" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">conv</text>
              <text x="71" y="72" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">1D</text>

              <line x1="87" y1="62" x2="100" y2="62" stroke="#44403c" stroke-width="0.8" />

              {/* Conv1D layer 2 */}
              <rect x="100" y="40" width="30" height="45" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="115" y="59" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">conv</text>
              <text x="115" y="72" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">1D</text>

              <line x1="130" y1="62" x2="143" y2="62" stroke="#44403c" stroke-width="0.8" />

              {/* Dense */}
              <rect x="143" y="45" width="30" height="35" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="158" y="67" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">dense</text>

              <line x1="173" y1="62" x2="183" y2="62" stroke="#44403c" stroke-width="0.8" />

              {/* Output classes */}
              <circle cx="190" cy="40" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="190" cy="62" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="190" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <line x1="183" y1="62" x2="185" y2="40" stroke="#44403c" stroke-width="0.8" />
              <line x1="183" y1="62" x2="185" y2="84" stroke="#44403c" stroke-width="0.8" />
              <text x="190" y="106" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">classes</text>
            </svg>

            <h3 class="text-orange-300 text-sm font-bold mb-2">On-Device Text Classification</h3>
            <p class="text-stone-500 text-xs leading-relaxed">
              Small CNN or lightweight transformer for local intent detection and spam
              filtering. Runs entirely on-device — no data leaves, no cloud inference.
              Fine-tune on user-specific patterns without exfiltrating training data.
            </p>
            <A
              href="/work/text-classification"
              class="inline-flex items-center gap-1.5 text-orange-600 text-xs hover:text-orange-400 transition-colors mt-3"
            >
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </A>
          </div>
        </div>

        {/* Card 3 */}
        <div>
          <div
            class="border border-orange-900/40 rounded-lg p-6 bg-zinc-950/80"
            style='font-family: "JetBrains Mono", monospace;'
          >
            {/* Autoencoder diagram */}
            <svg viewBox="0 0 200 140" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
              {/* Input */}
              <circle cx="18" cy="30" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="18" cy="52" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="18" cy="74" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="18" cy="96" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="18" y="116" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">input</text>

              {/* Encoder narrowing */}
              {["30","52","74","96"].map(y => <>
                <line x1="23" y1={y} x2="53" y2="42" stroke="#44403c" stroke-width="0.5" />
                <line x1="23" y1={y} x2="53" y2="63" stroke="#44403c" stroke-width="0.5" />
                <line x1="23" y1={y} x2="53" y2="84" stroke="#44403c" stroke-width="0.5" />
              </>)}
              <circle cx="58" cy="42" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="58" cy="63" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="58" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="58" y="128" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">encoder</text>

              {/* To bottleneck */}
              <line x1="63" y1="42" x2="93" y2="53" stroke="#44403c" stroke-width="0.5" />
              <line x1="63" y1="63" x2="93" y2="63" stroke="#44403c" stroke-width="0.5" />
              <line x1="63" y1="84" x2="93" y2="73" stroke="#44403c" stroke-width="0.5" />

              {/* Bottleneck */}
              <circle cx="100" cy="53" r="5" fill="none" stroke="#a8a29e" stroke-width="1.2" />
              <circle cx="100" cy="73" r="5" fill="none" stroke="#a8a29e" stroke-width="1.2" />
              <text x="100" y="28" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">latent</text>

              {/* Decoder widening */}
              <line x1="105" y1="53" x2="137" y2="42" stroke="#44403c" stroke-width="0.5" />
              <line x1="105" y1="63" x2="137" y2="63" stroke="#44403c" stroke-width="0.5" />
              <line x1="105" y1="73" x2="137" y2="84" stroke="#44403c" stroke-width="0.5" />
              <circle cx="142" cy="42" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="142" cy="63" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="142" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="142" y="128" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">decoder</text>

              {/* To reconstruction */}
              {["42","63","84"].map(y => <>
                <line x1="147" y1={y} x2="175" y2="30" stroke="#44403c" stroke-width="0.5" />
                <line x1="147" y1={y} x2="175" y2="52" stroke="#44403c" stroke-width="0.5" />
                <line x1="147" y1={y} x2="175" y2="74" stroke="#44403c" stroke-width="0.5" />
                <line x1="147" y1={y} x2="175" y2="96" stroke="#44403c" stroke-width="0.5" />
              </>)}
              <circle cx="182" cy="30" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="182" cy="52" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="182" cy="74" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <circle cx="182" cy="96" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
              <text x="182" y="116" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">recon.</text>
            </svg>

            <h3 class="text-orange-300 text-sm font-bold mb-2">Sensor Anomaly Detection</h3>
            <p class="text-stone-500 text-xs leading-relaxed">
              Autoencoder trained on-device for edge IoT. Learns normal sensor patterns
              during a calibration window, then flags deviations in real-time.
              No labeled data required — reconstruction error is the anomaly signal.
            </p>
            <A
              href="/work/anomaly-detection"
              class="inline-flex items-center gap-1.5 text-orange-600 text-xs hover:text-orange-400 transition-colors mt-3"
            >
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </A>
          </div>
        </div>
      </div>
    </div>
  );
}
