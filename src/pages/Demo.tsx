import { createSignal, createEffect, onCleanup } from "solid-js";
import type { Worker } from "../ml/environment";
import type { StepData, EpisodeData, BaselineData } from "../ml/worker";
import GanttChart from "../components/demo/GanttChart";
import RewardCurve from "../components/demo/RewardCurve";
import Controls from "../components/demo/Controls";
import BaselinePanel from "../components/demo/BaselinePanel";
import PrivacyBadge from "../components/demo/PrivacyBadge";

const emptyWorkers = (): Worker[] => [
  { load: 0, timeToFree: 0, jobs: [] },
  { load: 0, timeToFree: 0, jobs: [] },
  { load: 0, timeToFree: 0, jobs: [] },
];

export default function Demo() {
  const [status, setStatus] = createSignal("initializing");
  const [arrivalRate, setArrivalRate] = createSignal(0.6);
  const [numJobTypes, setNumJobTypes] = createSignal(3);

  // PPO state
  const [ppoWorkers, setPpoWorkers] = createSignal<Worker[]>(emptyWorkers());
  const [ppoTime, setPpoTime] = createSignal(0);
  const [ppoRewards, setPpoRewards] = createSignal<number[]>([]);

  // Baseline state
  const [baselineWorkers, setBaselineWorkers] = createSignal<Worker[]>(emptyWorkers());
  const [baselineTime, setBaselineTime] = createSignal(0);
  const [baselineRewards, setBaselineRewards] = createSignal<number[]>([]);
  const [lastBaselineReward, setLastBaselineReward] = createSignal<number | null>(null);

  // Worker ref
  let worker: globalThis.Worker | null = null;

  function createWorker() {
    worker = new Worker(new URL("../ml/worker.ts", import.meta.url), {
      type: "module",
    });

    worker.onmessage = (e: MessageEvent) => {
      const { type, data, status: workerStatus } = e.data;

      switch (type) {
        case "status":
          setStatus(workerStatus);
          break;

        case "step": {
          const step = data as StepData;
          setPpoWorkers(step.workers);
          setPpoTime(step.currentTime);
          break;
        }

        case "episodeEnd": {
          const ep = data as EpisodeData;
          setPpoRewards((prev) => [...prev, ep.totalReward]);
          break;
        }

        case "baseline": {
          const bl = data as BaselineData;
          setBaselineRewards((prev) => [...prev, bl.totalReward]);
          setLastBaselineReward(bl.totalReward);
          break;
        }
      }
    };

    worker.onerror = (err) => {
      console.error("Worker error:", err);
      setStatus("error");
    };
  }

  createEffect(() => {
    createWorker();
  });

  onCleanup(() => {
    worker?.terminate();
  });

  function handleStart() {
    worker?.postMessage({ type: "start" });
  }

  function handlePause() {
    worker?.postMessage({ type: "pause" });
  }

  function handleReset() {
    worker?.postMessage({ type: "reset" });
    setPpoRewards([]);
    setBaselineRewards([]);
    setPpoWorkers(emptyWorkers());
    setBaselineWorkers(emptyWorkers());
    setPpoTime(0);
    setBaselineTime(0);
    setLastBaselineReward(null);
  }

  function handleArrivalRateChange(rate: number) {
    setArrivalRate(rate);
    worker?.postMessage({ type: "updateConfig", config: { arrivalRate: rate } });
  }

  function handleNumJobTypesChange(n: number) {
    setNumJobTypes(n);
    worker?.postMessage({ type: "updateConfig", config: { numJobTypes: n } });
  }

  return (
    <div class="mx-auto max-w-6xl px-6 py-12">
      <div class="mb-8">
        <h1 class="mb-2 font-mono text-3xl font-bold tracking-tight">
          PPO Job Scheduler
        </h1>
        <p class="text-zinc-500">
          Watch a reinforcement learning agent learn to schedule jobs across
          workers in real-time.
        </p>
      </div>

      <div class="mb-6">
        <PrivacyBadge />
      </div>

      <div class="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Main content */}
        <div class="space-y-6">
          {/* PPO Gantt */}
          <GanttChart
            workers={ppoWorkers()}
            currentTime={ppoTime()}
            title="PPO Agent"
          />

          {/* Baseline Gantt */}
          <BaselinePanel
            workers={baselineWorkers()}
            currentTime={baselineTime()}
            totalReward={lastBaselineReward()}
          />

          {/* Reward Curve */}
          <RewardCurve
            ppoRewards={ppoRewards()}
            baselineRewards={baselineRewards()}
          />
        </div>

        {/* Sidebar controls */}
        <div class="space-y-6">
          <Controls
            arrivalRate={arrivalRate()}
            numJobTypes={numJobTypes()}
            status={status()}
            onArrivalRateChange={handleArrivalRateChange}
            onNumJobTypesChange={handleNumJobTypesChange}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
          />

          {/* Stats */}
          <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 class="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500">
              Stats
            </h3>
            <div class="space-y-2 font-mono text-xs text-zinc-400">
              <div class="flex justify-between">
                <span>Episodes</span>
                <span class="text-zinc-300">{ppoRewards().length}</span>
              </div>
              <div class="flex justify-between">
                <span>Last Reward</span>
                <span class="text-zinc-300">
                  {ppoRewards().length > 0
                    ? ppoRewards()[ppoRewards().length - 1].toFixed(1)
                    : "—"}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Time Step</span>
                <span class="text-zinc-300">{ppoTime()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
