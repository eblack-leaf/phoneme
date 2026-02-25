interface ControlsProps {
  arrivalRate: number;
  numJobTypes: number;
  status: string;
  onArrivalRateChange: (rate: number) => void;
  onNumJobTypesChange: (n: number) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function Controls(props: ControlsProps) {
  return (
    <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-4 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500">
        Controls
      </h3>

      <div class="space-y-4">
        {/* Status */}
        <div class="flex items-center gap-2">
          <div
            class={`h-2 w-2 rounded-full ${
              props.status === "training"
                ? "bg-green-400 animate-pulse"
                : props.status === "paused"
                  ? "bg-yellow-400"
                  : "bg-zinc-600"
            }`}
          />
          <span class="font-mono text-xs text-zinc-400">{props.status}</span>
        </div>

        {/* Action buttons */}
        <div class="flex gap-2">
          <button
            onClick={props.status === "training" ? props.onPause : props.onStart}
            class="rounded-md bg-zinc-800 px-3 py-1.5 font-mono text-xs text-zinc-300 transition hover:bg-zinc-700"
          >
            {props.status === "training" ? "Pause" : "Start"}
          </button>
          <button
            onClick={props.onReset}
            class="rounded-md border border-zinc-700 px-3 py-1.5 font-mono text-xs text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-300"
          >
            Reset
          </button>
        </div>

        {/* Arrival rate slider */}
        <div>
          <label class="mb-1 block font-mono text-xs text-zinc-500">
            Job arrival rate: {props.arrivalRate.toFixed(2)}
          </label>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={props.arrivalRate}
            onInput={(e) => props.onArrivalRateChange(parseFloat(e.currentTarget.value))}
            class="w-full accent-brand"
          />
        </div>

        {/* Job types slider */}
        <div>
          <label class="mb-1 block font-mono text-xs text-zinc-500">
            Job types: {props.numJobTypes}
          </label>
          <input
            type="range"
            min="2"
            max="5"
            step="1"
            value={props.numJobTypes}
            onInput={(e) => props.onNumJobTypesChange(parseInt(e.currentTarget.value))}
            class="w-full accent-brand"
          />
        </div>
      </div>
    </div>
  );
}
