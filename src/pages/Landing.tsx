import { A } from "@solidjs/router";

export default function Landing() {
  return (
    <div class="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center px-6">
      <div class="max-w-2xl text-center">
        <h1 class="mb-2 font-mono text-6xl font-bold tracking-tighter text-zinc-50 sm:text-7xl">
          phoneme
        </h1>
        <p class="mb-8 font-mono text-lg text-brand">
          systems that learn, running where you control them
        </p>
        <p class="mx-auto mb-12 max-w-lg text-zinc-400 leading-relaxed">
          On-device ML infrastructure. No cloud dependencies, no data exfiltration.
          Models that run in your browser, on your hardware, under your authority.
        </p>
        <div class="flex items-center justify-center gap-4">
          <A
            href="/demo"
            class="rounded-md bg-brand px-6 py-3 text-sm font-medium text-zinc-950 transition hover:bg-brand-dim hover:text-zinc-100"
          >
            Live Demo
          </A>
          <A
            href="/work/scheduler"
            class="rounded-md border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
          >
            View Work
          </A>
        </div>
      </div>

      <div class="absolute bottom-12 animate-pulse text-zinc-600">
        <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}
