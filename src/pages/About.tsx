export default function About() {
  return (
    <div class="mx-auto max-w-3xl px-6 py-16">
      <h1 class="mb-2 font-mono text-4xl font-bold tracking-tight">About</h1>
      <p class="mb-12 text-zinc-500">Infrastructure for on-device intelligence</p>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Phoneme</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400 leading-relaxed space-y-4">
          <p>
            Phoneme builds ML systems that run where your data lives &mdash; on your devices,
            in your infrastructure, under your control. No cloud round-trips, no third-party
            data processing, no vendor lock-in.
          </p>
          <p>
            We focus on making reinforcement learning and inference practical at the edge:
            browser-native training, embedded deployment, and tooling that respects
            the operator's sovereignty over their own compute.
          </p>
        </div>
      </section>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Consulting</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400 leading-relaxed space-y-4">
          <p>
            Available for engagements in on-device ML deployment, RL system design,
            compiler optimization, and performance-critical systems work.
          </p>
          <p>
            Content pending &mdash; engagement model, past clients, contact details.
          </p>
        </div>
      </section>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Background</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
          <p>Content pending &mdash; technical background, publications, open source.</p>
        </div>
      </section>
    </div>
  );
}
