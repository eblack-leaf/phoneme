/**
 * Web Worker entry point for PPO training loop.
 *
 * Messages IN:  { type: "start" | "pause" | "reset" | "updateConfig", config?: Partial<EnvConfig> }
 * Messages OUT: { type: "step", data: StepData }
 *             | { type: "episodeEnd", data: EpisodeData }
 *             | { type: "status", status: string }
 *             | { type: "baseline", data: BaselineData }
 */
import * as tf from "@tensorflow/tfjs";
import { JobSchedulerEnv, type EnvConfig, type Worker as EnvWorker } from "./environment";
import { createModel, type ActorCriticModel } from "./model";
import { PPOTrainer } from "./ppo";
import { runRoundRobinEpisode } from "./baseline";

export interface StepData {
  workers: EnvWorker[];
  assignedJobType: number | null;
  assignedJobId: number | null;
  assignedWorker: number;
  currentTime: number;
  reward: number;
  queueLength: number;
}

export interface EpisodeData {
  episode: number;
  totalReward: number;
  avgLoss: number;
  steps: number;
}

export interface BaselineData {
  totalReward: number;
}

let env: JobSchedulerEnv;
let model: ActorCriticModel;
let trainer: PPOTrainer;
let running = false;
let episode = 0;
let intervalId: ReturnType<typeof setInterval> | null = null;

function init() {
  env = new JobSchedulerEnv();
  model = createModel({ stateSize: env.stateSize });
  trainer = new PPOTrainer();
}

function runStep() {
  if (!running) return;

  const state = env.getState();
  const { action, logProb, value } = trainer.selectAction(model, state);
  const result = env.step(action);

  trainer.collectStep({
    state,
    action,
    reward: result.reward,
    nextState: result.nextState,
    done: result.done,
    logProb,
    value,
  });

  // Post step data to UI
  const stepData: StepData = {
    workers: result.info.workers,
    assignedJobType: result.info.assignedJob?.type ?? null,
    assignedJobId: result.info.assignedJob?.id ?? null,
    assignedWorker: action,
    currentTime: result.info.currentTime,
    reward: result.reward,
    queueLength: env.jobQueue.length,
  };
  self.postMessage({ type: "step", data: stepData });

  if (result.done) {
    // Run PPO update
    const avgLoss = trainer.update(model);
    episode++;

    // Calculate episode reward
    let totalReward = 0;
    // We need to track this during the episode
    // For now, approximate from the trainer
    const episodeData: EpisodeData = {
      episode,
      totalReward: 0, // Will be accumulated
      avgLoss,
      steps: env.stepCount,
    };
    self.postMessage({ type: "episodeEnd", data: episodeData });

    // Run baseline comparison every 5 episodes
    if (episode % 5 === 0) {
      const baselineResult = runRoundRobinEpisode(env.config);
      self.postMessage({
        type: "baseline",
        data: { totalReward: baselineResult.totalReward } as BaselineData,
      });
    }

    // Reset for next episode
    env.reset();
  }
}

// We'll track episode reward properly
let episodeReward = 0;

function runStepTracked() {
  if (!running) return;

  const state = env.getState();
  const { action, logProb, value } = trainer.selectAction(model, state);
  const result = env.step(action);

  episodeReward += result.reward;

  trainer.collectStep({
    state,
    action,
    reward: result.reward,
    nextState: result.nextState,
    done: result.done,
    logProb,
    value,
  });

  const stepData: StepData = {
    workers: result.info.workers,
    assignedJobType: result.info.assignedJob?.type ?? null,
    assignedJobId: result.info.assignedJob?.id ?? null,
    assignedWorker: action,
    currentTime: result.info.currentTime,
    reward: result.reward,
    queueLength: env.jobQueue.length,
  };
  self.postMessage({ type: "step", data: stepData });

  if (result.done) {
    const avgLoss = trainer.update(model);
    episode++;

    self.postMessage({
      type: "episodeEnd",
      data: {
        episode,
        totalReward: episodeReward,
        avgLoss,
        steps: env.stepCount,
      } as EpisodeData,
    });

    if (episode % 5 === 0) {
      const baselineResult = runRoundRobinEpisode(env.config);
      self.postMessage({
        type: "baseline",
        data: { totalReward: baselineResult.totalReward } as BaselineData,
      });
    }

    episodeReward = 0;
    env.reset();
  }
}

self.onmessage = (e: MessageEvent) => {
  const { type, config } = e.data;

  switch (type) {
    case "start":
      if (!env) init();
      if (!running) {
        running = true;
        env.reset();
        episodeReward = 0;
        self.postMessage({ type: "status", status: "training" });
        // Run multiple steps per interval for speed
        intervalId = setInterval(() => {
          for (let i = 0; i < 5; i++) {
            runStepTracked();
          }
        }, 16); // ~60fps intervals, 5 steps each
      }
      break;

    case "pause":
      running = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      self.postMessage({ type: "status", status: "paused" });
      break;

    case "reset":
      running = false;
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      episode = 0;
      episodeReward = 0;
      // Dispose old model tensors
      if (model) {
        tf.dispose(
          Object.values(model).filter((v): v is tf.Variable => v instanceof tf.Variable),
        );
      }
      init();
      self.postMessage({ type: "status", status: "reset" });
      break;

    case "updateConfig":
      if (config && env) {
        env.updateConfig(config as Partial<EnvConfig>);
      }
      break;
  }
};

// Signal ready
self.postMessage({ type: "status", status: "ready" });
