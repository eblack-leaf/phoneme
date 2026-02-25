/**
 * PPO (Proximal Policy Optimization) update loop.
 * Clipped surrogate objective with GAE advantage estimation.
 */
import * as tf from "@tensorflow/tfjs";
import {
  ActorCriticModel,
  forwardActor,
  forwardCritic,
  getVariables,
} from "./model";

export interface PPOConfig {
  gamma: number;         // discount factor
  lambda: number;        // GAE lambda
  epsilon: number;       // clip epsilon
  entropyCoeff: number;  // entropy bonus coefficient
  valueLossCoeff: number;
  learningRate: number;
  epochs: number;        // PPO epochs per update
  miniBatchSize: number;
}

const DEFAULT_PPO_CONFIG: PPOConfig = {
  gamma: 0.99,
  lambda: 0.95,
  epsilon: 0.2,
  entropyCoeff: 0.01,
  valueLossCoeff: 0.5,
  learningRate: 3e-4,
  epochs: 4,
  miniBatchSize: 32,
};

export interface Transition {
  state: Float32Array;
  action: number;
  reward: number;
  nextState: Float32Array;
  done: boolean;
  logProb: number;
  value: number;
}

export class PPOTrainer {
  config: PPOConfig;
  private optimizer: tf.Optimizer;
  private trajectory: Transition[] = [];

  constructor(config?: Partial<PPOConfig>) {
    this.config = { ...DEFAULT_PPO_CONFIG, ...config };
    this.optimizer = tf.train.adam(this.config.learningRate);
  }

  /** Sample an action from the policy, returning action, logProb, value */
  selectAction(
    model: ActorCriticModel,
    state: Float32Array,
  ): { action: number; logProb: number; value: number } {
    return tf.tidy(() => {
      const stateTensor = tf.tensor2d([Array.from(state)]);
      const probs = forwardActor(model, stateTensor);
      const value = forwardCritic(model, stateTensor);

      const probsData = probs.dataSync();
      const valueData = value.dataSync()[0];

      // Sample from categorical distribution
      const r = Math.random();
      let cumulative = 0;
      let action = 0;
      for (let i = 0; i < probsData.length; i++) {
        cumulative += probsData[i];
        if (r < cumulative) {
          action = i;
          break;
        }
      }

      const logProb = Math.log(probsData[action] + 1e-8);

      return { action, logProb, value: valueData };
    });
  }

  /** Store a transition */
  collectStep(transition: Transition): void {
    this.trajectory.push(transition);
  }

  /** Compute GAE advantages */
  private computeAdvantages(
    model: ActorCriticModel,
  ): { advantages: Float32Array; returns: Float32Array } {
    const T = this.trajectory.length;
    const advantages = new Float32Array(T);
    const returns = new Float32Array(T);

    let lastGAE = 0;
    for (let t = T - 1; t >= 0; t--) {
      const tr = this.trajectory[t];
      const nextValue = tr.done
        ? 0
        : t < T - 1
          ? this.trajectory[t + 1].value
          : tf.tidy(() => {
              const s = tf.tensor2d([Array.from(tr.nextState)]);
              return forwardCritic(model, s).dataSync()[0];
            });

      const delta = tr.reward + this.config.gamma * nextValue - tr.value;
      lastGAE = delta + this.config.gamma * this.config.lambda * (tr.done ? 0 : 1) * lastGAE;
      advantages[t] = lastGAE;
      returns[t] = lastGAE + tr.value;
    }

    return { advantages, returns };
  }

  /** Run PPO update on collected trajectory. Returns mean loss. */
  update(model: ActorCriticModel): number {
    if (this.trajectory.length === 0) return 0;

    const { advantages, returns } = this.computeAdvantages(model);

    // Normalize advantages
    const advMean = advantages.reduce((a, b) => a + b, 0) / advantages.length;
    const advStd = Math.sqrt(
      advantages.reduce((a, b) => a + (b - advMean) ** 2, 0) / advantages.length + 1e-8,
    );
    for (let i = 0; i < advantages.length; i++) {
      advantages[i] = (advantages[i] - advMean) / advStd;
    }

    const states = this.trajectory.map((t) => Array.from(t.state));
    const actions = this.trajectory.map((t) => t.action);
    const oldLogProbs = this.trajectory.map((t) => t.logProb);

    let totalLoss = 0;
    const variables = getVariables(model);

    for (let epoch = 0; epoch < this.config.epochs; epoch++) {
      const loss = this.optimizer.minimize(() => {
        const statesTensor = tf.tensor2d(states);
        const probs = forwardActor(model, statesTensor);
        const values = forwardCritic(model, statesTensor).squeeze([1]);

        // Gather log probs for taken actions
        const actionOneHot = tf.oneHot(actions, 3);
        const selectedProbs = probs.mul(actionOneHot).sum(-1);
        const newLogProbs = tf.log(selectedProbs.add(1e-8));

        // Ratio
        const oldLogProbsTensor = tf.tensor1d(oldLogProbs);
        const ratio = tf.exp(newLogProbs.sub(oldLogProbsTensor));

        // Clipped surrogate
        const advantagesTensor = tf.tensor1d(Array.from(advantages));
        const surr1 = ratio.mul(advantagesTensor);
        const surr2 = tf
          .clipByValue(ratio, 1 - this.config.epsilon, 1 + this.config.epsilon)
          .mul(advantagesTensor);
        const policyLoss = tf.minimum(surr1, surr2).mean().neg();

        // Value loss
        const returnsTensor = tf.tensor1d(Array.from(returns));
        const valueLoss = values.sub(returnsTensor).square().mean();

        // Entropy bonus
        const entropy = probs.mul(tf.log(probs.add(1e-8))).sum(-1).mean().neg();

        return policyLoss
          .add(valueLoss.mul(this.config.valueLossCoeff))
          .sub(entropy.mul(this.config.entropyCoeff)) as tf.Scalar;
      }, true, variables) as tf.Scalar;

      totalLoss += loss.dataSync()[0];
      loss.dispose();
    }

    // Clear trajectory
    this.trajectory = [];

    return totalLoss / this.config.epochs;
  }

  /** Clear collected trajectory without updating */
  clearTrajectory(): void {
    this.trajectory = [];
  }

  get trajectoryLength(): number {
    return this.trajectory.length;
  }
}
