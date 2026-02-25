/**
 * Job Scheduler Environment for PPO training.
 *
 * State: 3 workers (load, time-to-free) + job queue (duration, priority, time-waiting) + queue depth
 * Action: assign incoming job to worker 0, 1, or 2
 * Reward: negative makespan delta per assignment
 */

export interface Job {
  id: number;
  type: number;
  duration: number;
  priority: number;
  arrivalTime: number;
  timeWaiting: number;
}

export interface Worker {
  load: number;        // total remaining work
  timeToFree: number;  // steps until idle
  jobs: { id: number; type: number; remaining: number }[];
}

export interface StepResult {
  nextState: Float32Array;
  reward: number;
  done: boolean;
  info: {
    workers: Worker[];
    assignedJob: Job | null;
    currentTime: number;
  };
}

export interface EnvConfig {
  arrivalRate: number;   // probability of new job per step [0..1]
  numJobTypes: number;   // 2-5
  maxSteps: number;
  maxQueueVisible: number; // how many queue items in state vector
}

const DEFAULT_CONFIG: EnvConfig = {
  arrivalRate: 0.6,
  numJobTypes: 3,
  maxSteps: 200,
  maxQueueVisible: 5,
};

// State vector layout:
// Per worker (3 workers × 2 values = 6): [load, timeToFree]
// Per visible job (maxQueueVisible × 3 values): [duration, priority, timeWaiting]
// Queue depth (1 value, normalized)
// Total: 6 + maxQueueVisible*3 + 1

export class JobSchedulerEnv {
  config: EnvConfig;
  workers: Worker[] = [];
  jobQueue: Job[] = [];
  currentTime = 0;
  stepCount = 0;
  nextJobId = 0;
  prevMakespan = 0;

  readonly stateSize: number;
  readonly actionSize = 3; // 3 workers

  constructor(config?: Partial<EnvConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stateSize = 6 + this.config.maxQueueVisible * 3 + 1;
  }

  reset(): Float32Array {
    this.workers = Array.from({ length: 3 }, () => ({
      load: 0,
      timeToFree: 0,
      jobs: [],
    }));
    this.jobQueue = [];
    this.currentTime = 0;
    this.stepCount = 0;
    this.nextJobId = 0;
    this.prevMakespan = 0;

    // Seed initial jobs
    for (let i = 0; i < 3; i++) {
      this.jobQueue.push(this.generateJob());
    }

    return this.getState();
  }

  step(action: number): StepResult {
    // Clamp action
    action = Math.max(0, Math.min(2, action));

    // Assign first job in queue to chosen worker
    let assignedJob: Job | null = null;
    if (this.jobQueue.length > 0) {
      assignedJob = this.jobQueue.shift()!;
      const worker = this.workers[action];
      worker.load += assignedJob.duration;
      worker.timeToFree = Math.max(worker.timeToFree, 0) + assignedJob.duration;
      worker.jobs.push({
        id: assignedJob.id,
        type: assignedJob.type,
        remaining: assignedJob.duration,
      });
    }

    // Advance time by 1 step
    this.currentTime++;
    this.stepCount++;

    for (const w of this.workers) {
      // Tick down worker timers
      w.timeToFree = Math.max(0, w.timeToFree - 1);
      w.load = Math.max(0, w.load - 1);
      // Tick down job remaining
      if (w.jobs.length > 0) {
        w.jobs[0].remaining -= 1;
        if (w.jobs[0].remaining <= 0) {
          w.jobs.shift();
        }
      }
    }

    // Increase waiting time for queued jobs
    for (const j of this.jobQueue) {
      j.timeWaiting++;
    }

    // Maybe spawn new job
    if (Math.random() < this.config.arrivalRate) {
      this.jobQueue.push(this.generateJob());
    }

    // Compute reward: negative makespan delta
    const makespan = Math.max(...this.workers.map((w) => w.timeToFree));
    const reward = this.prevMakespan - makespan - 0.1; // small step penalty
    this.prevMakespan = makespan;

    // Add priority bonus for high-priority jobs
    if (assignedJob && assignedJob.priority > 0.7) {
      // Bonus for quickly assigning high-priority jobs
    }

    const done = this.stepCount >= this.config.maxSteps;

    return {
      nextState: this.getState(),
      reward,
      done,
      info: {
        workers: this.workers.map((w) => ({ ...w, jobs: [...w.jobs] })),
        assignedJob,
        currentTime: this.currentTime,
      },
    };
  }

  getState(): Float32Array {
    const state = new Float32Array(this.stateSize);
    let idx = 0;

    // Worker features (normalized)
    for (const w of this.workers) {
      state[idx++] = w.load / 20;       // normalize by max expected load
      state[idx++] = w.timeToFree / 20;
    }

    // Visible job queue features
    for (let i = 0; i < this.config.maxQueueVisible; i++) {
      if (i < this.jobQueue.length) {
        const j = this.jobQueue[i];
        state[idx++] = j.duration / 10;
        state[idx++] = j.priority;
        state[idx++] = j.timeWaiting / 20;
      } else {
        state[idx++] = 0;
        state[idx++] = 0;
        state[idx++] = 0;
      }
    }

    // Queue depth
    state[idx++] = Math.min(this.jobQueue.length / 10, 1);

    return state;
  }

  private generateJob(): Job {
    const type = Math.floor(Math.random() * this.config.numJobTypes);
    // Duration varies by type
    const baseDurations = [2, 4, 6, 8, 3];
    const duration = baseDurations[type] + Math.floor(Math.random() * 3);
    return {
      id: this.nextJobId++,
      type,
      duration,
      priority: Math.random(),
      arrivalTime: this.currentTime,
      timeWaiting: 0,
    };
  }

  updateConfig(partial: Partial<EnvConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}
