/**
 * Round-robin baseline for comparison against PPO agent.
 */
import { JobSchedulerEnv, type StepResult, type EnvConfig } from "./environment";

export interface BaselineResult {
  totalReward: number;
  steps: StepResult[];
}

/** Run one full episode with round-robin assignment */
export function runRoundRobinEpisode(config?: Partial<EnvConfig>): BaselineResult {
  const env = new JobSchedulerEnv(config);
  env.reset();

  let totalReward = 0;
  let workerIdx = 0;
  const steps: StepResult[] = [];

  let done = false;
  while (!done) {
    const result = env.step(workerIdx);
    totalReward += result.reward;
    steps.push(result);
    done = result.done;

    // Cycle to next worker
    workerIdx = (workerIdx + 1) % 3;
  }

  return { totalReward, steps };
}
