/**
 * Actor-Critic model with attention over job queue, built in raw TF.js ops.
 */
import * as tf from "@tensorflow/tfjs";

export interface ModelConfig {
  stateSize: number;
  numWorkers: number;       // action space size (3)
  numVisibleJobs: number;   // how many jobs in state vector (5)
  jobFeatureSize: number;   // features per job (3: duration, priority, timeWaiting)
  hiddenSize: number;       // 64
}

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  stateSize: 22, // 6 + 5*3 + 1
  numWorkers: 3,
  numVisibleJobs: 5,
  jobFeatureSize: 3,
  hiddenSize: 64,
};

export interface ActorCriticModel {
  // Shared base weights
  sharedW1: tf.Variable;
  sharedB1: tf.Variable;

  // Attention weights (query from shared, key/value from job features)
  attnQueryW: tf.Variable;
  attnKeyW: tf.Variable;
  attnValueW: tf.Variable;

  // Actor head
  actorW1: tf.Variable;
  actorB1: tf.Variable;
  actorW2: tf.Variable;
  actorB2: tf.Variable;

  // Critic head
  criticW1: tf.Variable;
  criticB1: tf.Variable;
  criticW2: tf.Variable;
  criticB2: tf.Variable;
}

export function createModel(config?: Partial<ModelConfig>): ActorCriticModel {
  const c = { ...DEFAULT_MODEL_CONFIG, ...config };
  const h = c.hiddenSize;
  const attnDim = 16;

  return {
    // Shared base: stateSize → hiddenSize
    sharedW1: tf.variable(tf.randomNormal([c.stateSize, h], 0, 0.1)),
    sharedB1: tf.variable(tf.zeros([h])),

    // Attention: project shared hidden → queries, job features → keys/values
    attnQueryW: tf.variable(tf.randomNormal([h, attnDim], 0, 0.1)),
    attnKeyW: tf.variable(tf.randomNormal([c.jobFeatureSize, attnDim], 0, 0.1)),
    attnValueW: tf.variable(tf.randomNormal([c.jobFeatureSize, attnDim], 0, 0.1)),

    // Actor: (hiddenSize + attnDim) → hiddenSize → numWorkers
    actorW1: tf.variable(tf.randomNormal([h + attnDim, h], 0, 0.1)),
    actorB1: tf.variable(tf.zeros([h])),
    actorW2: tf.variable(tf.randomNormal([h, c.numWorkers], 0, 0.1)),
    actorB2: tf.variable(tf.zeros([c.numWorkers])),

    // Critic: (hiddenSize + attnDim) → hiddenSize → 1
    criticW1: tf.variable(tf.randomNormal([h + attnDim, h], 0, 0.1)),
    criticB1: tf.variable(tf.zeros([h])),
    criticW2: tf.variable(tf.randomNormal([h, 1], 0, 0.1)),
    criticB2: tf.variable(tf.zeros([1])),
  };
}

/**
 * Extract job features from state vector.
 * State layout: [worker_feats(6), job_feats(numVisibleJobs * jobFeatureSize), queue_depth(1)]
 */
function extractJobFeatures(
  state: tf.Tensor2D,
  numVisibleJobs: number,
  jobFeatureSize: number,
): tf.Tensor2D {
  // Jobs start at index 6 (after 3 workers × 2 features)
  const jobStart = 6;
  const jobEnd = jobStart + numVisibleJobs * jobFeatureSize;
  const jobFlat = state.slice([0, jobStart], [-1, jobEnd - jobStart]);
  const batchSize = state.shape[0];
  return jobFlat.reshape([batchSize * numVisibleJobs, jobFeatureSize]) as tf.Tensor2D;
}

/**
 * Forward pass through the shared base + attention.
 * Returns concatenated feature vector [shared_hidden, attention_context].
 */
function forwardBase(
  model: ActorCriticModel,
  state: tf.Tensor2D,
  config: ModelConfig,
): tf.Tensor2D {
  const batchSize = state.shape[0];

  // Shared hidden
  const hidden = tf.relu(tf.add(tf.matMul(state, model.sharedW1), model.sharedB1)) as tf.Tensor2D;

  // Attention over job features
  const jobFeats = extractJobFeatures(state, config.numVisibleJobs, config.jobFeatureSize);

  // Query: [batch, attnDim]
  const queries = tf.matMul(hidden, model.attnQueryW); // [batch, attnDim]

  // Keys: [batch*numJobs, attnDim] → [batch, numJobs, attnDim]
  const keys = tf.matMul(jobFeats, model.attnKeyW).reshape([batchSize, config.numVisibleJobs, -1]);

  // Values: [batch*numJobs, attnDim] → [batch, numJobs, attnDim]
  const values = tf.matMul(jobFeats, model.attnValueW).reshape([batchSize, config.numVisibleJobs, -1]);

  // Dot-product attention: scores = Q·K^T / sqrt(d)
  const queryExpanded = queries.reshape([batchSize, 1, -1]); // [batch, 1, attnDim]
  const scores = tf.matMul(queryExpanded, keys, false, true).squeeze([1]) as tf.Tensor2D; // [batch, numJobs]
  const scaledScores = scores.div(tf.scalar(Math.sqrt(16)));
  const attnWeights = tf.softmax(scaledScores, -1); // [batch, numJobs]

  // Weighted sum: [batch, 1, numJobs] × [batch, numJobs, attnDim] → [batch, attnDim]
  const attnWeightsExpanded = attnWeights.reshape([batchSize, 1, config.numVisibleJobs]);
  const context = tf.matMul(attnWeightsExpanded, values).squeeze([1]) as tf.Tensor2D; // [batch, attnDim]

  // Concatenate shared hidden with attention context
  return tf.concat([hidden, context], 1) as tf.Tensor2D;
}

/** Actor forward: returns action probabilities [batch, numWorkers] */
export function forwardActor(
  model: ActorCriticModel,
  state: tf.Tensor2D,
  config?: Partial<ModelConfig>,
): tf.Tensor2D {
  const c = { ...DEFAULT_MODEL_CONFIG, ...config };
  const features = forwardBase(model, state, c);
  const h = tf.relu(tf.add(tf.matMul(features, model.actorW1), model.actorB1));
  const logits = tf.add(tf.matMul(h, model.actorW2), model.actorB2) as tf.Tensor2D;
  return tf.softmax(logits, -1) as tf.Tensor2D;
}

/** Critic forward: returns value estimate [batch, 1] */
export function forwardCritic(
  model: ActorCriticModel,
  state: tf.Tensor2D,
  config?: Partial<ModelConfig>,
): tf.Tensor2D {
  const c = { ...DEFAULT_MODEL_CONFIG, ...config };
  const features = forwardBase(model, state, c);
  const h = tf.relu(tf.add(tf.matMul(features, model.criticW1), model.criticB1));
  return tf.add(tf.matMul(h, model.criticW2), model.criticB2) as tf.Tensor2D;
}

/** Get all trainable variables */
export function getVariables(model: ActorCriticModel): tf.Variable[] {
  return [
    model.sharedW1, model.sharedB1,
    model.attnQueryW, model.attnKeyW, model.attnValueW,
    model.actorW1, model.actorB1, model.actorW2, model.actorB2,
    model.criticW1, model.criticB1, model.criticW2, model.criticB2,
  ];
}
