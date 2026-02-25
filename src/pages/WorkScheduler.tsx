export default function WorkScheduler() {
  return (
    <div class="mx-auto max-w-3xl px-6 py-16">
      <h1 class="mb-2 font-mono text-4xl font-bold tracking-tight">PPO Job Scheduler</h1>
      <p class="mb-12 text-zinc-500">Reinforcement learning for real-time task assignment</p>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Problem</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
          <p>
            Optimal job scheduling across heterogeneous workers is NP-hard in the general case.
            Classical heuristics (round-robin, shortest-job-first) leave performance on the table
            when job characteristics and arrival patterns are non-stationary.
          </p>
        </div>
      </section>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Architecture</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
          <p class="mb-4">
            Actor-critic architecture with dot-product attention over the job queue.
            The agent observes worker loads, pending job properties, and queue depth,
            then assigns each arriving job to a worker.
          </p>
          {/* Diagram placeholder */}
          <div class="flex h-48 items-center justify-center rounded border border-dashed border-zinc-700 text-zinc-600">
            Architecture diagram placeholder
          </div>
        </div>
      </section>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Design Decisions</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400 space-y-3">
          <p>
            <strong class="text-zinc-300">Why PPO?</strong> Stable on-policy algorithm well-suited to
            environments with discrete action spaces. Clip objective prevents catastrophic policy updates.
          </p>
          <p>
            <strong class="text-zinc-300">Why attention?</strong> Variable-length job queues require a
            mechanism to aggregate over an arbitrary number of pending items. Dot-product attention
            provides a learnable, permutation-aware summary.
          </p>
          <p>
            <strong class="text-zinc-300">Why in-browser?</strong> Demonstrates that meaningful RL
            training is feasible on commodity hardware via TensorFlow.js and Web Workers, with
            zero server infrastructure.
          </p>
        </div>
      </section>

      <section class="mb-12">
        <h2 class="mb-4 font-mono text-xl font-semibold text-zinc-200">Results</h2>
        <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6 text-zinc-400">
          <p>Content pending — training curves, comparison vs baselines, convergence analysis.</p>
        </div>
      </section>
    </div>
  );
}
