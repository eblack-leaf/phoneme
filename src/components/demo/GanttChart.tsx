import { For, createMemo } from "solid-js";
import type { Worker } from "../../ml/environment";

interface GanttChartProps {
  workers: Worker[];
  currentTime: number;
  title?: string;
}

const JOB_COLORS = [
  "fill-[var(--color-job-0)]",
  "fill-[var(--color-job-1)]",
  "fill-[var(--color-job-2)]",
  "fill-[var(--color-job-3)]",
  "fill-[var(--color-job-4)]",
];

const LANE_HEIGHT = 32;
const LANE_GAP = 8;
const LEFT_MARGIN = 80;
const TIME_SCALE = 12; // pixels per time unit

export default function GanttChart(props: GanttChartProps) {
  const svgWidth = () => LEFT_MARGIN + 30 * TIME_SCALE;
  const svgHeight = () => 3 * (LANE_HEIGHT + LANE_GAP) + 24;

  const visibleWindow = createMemo(() => {
    const windowSize = 25;
    const start = Math.max(0, props.currentTime - windowSize);
    return { start, end: start + 30 };
  });

  return (
    <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      {props.title && (
        <h3 class="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500">
          {props.title}
        </h3>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth()} ${svgHeight()}`}
        class="overflow-visible"
      >
        {/* Worker lane labels */}
        <For each={props.workers}>
          {(worker, i) => {
            const y = () => i() * (LANE_HEIGHT + LANE_GAP);
            return (
              <>
                {/* Lane label */}
                <text
                  x={4}
                  y={y() + LANE_HEIGHT / 2 + 4}
                  class="fill-zinc-500 font-mono text-[10px]"
                >
                  W{i()}
                </text>

                {/* Lane background */}
                <rect
                  x={LEFT_MARGIN}
                  y={y()}
                  width={svgWidth() - LEFT_MARGIN}
                  height={LANE_HEIGHT}
                  rx={4}
                  class="fill-zinc-800/40"
                />

                {/* Load bar */}
                <rect
                  x={LEFT_MARGIN}
                  y={y()}
                  width={Math.min(worker.timeToFree * TIME_SCALE, svgWidth() - LEFT_MARGIN)}
                  height={LANE_HEIGHT}
                  rx={4}
                  class="fill-zinc-700/50 transition-all duration-200"
                />

                {/* Job blocks */}
                <For each={worker.jobs}>
                  {(job, j) => {
                    const jobX = () => LEFT_MARGIN + j() * 2; // stack them visually
                    const colorClass = JOB_COLORS[job.type % JOB_COLORS.length];
                    return (
                      <rect
                        x={LEFT_MARGIN + j() * (job.remaining * TIME_SCALE + 2)}
                        y={y() + 4}
                        width={Math.max(job.remaining * TIME_SCALE - 2, 4)}
                        height={LANE_HEIGHT - 8}
                        rx={3}
                        class={`${colorClass} opacity-80 transition-all duration-200`}
                      />
                    );
                  }}
                </For>

                {/* Load text */}
                <text
                  x={28}
                  y={y() + LANE_HEIGHT / 2 + 4}
                  class="fill-zinc-600 font-mono text-[9px]"
                >
                  load:{worker.load}
                </text>
              </>
            );
          }}
        </For>

        {/* Time axis */}
        <line
          x1={LEFT_MARGIN}
          y1={svgHeight() - 12}
          x2={svgWidth()}
          y2={svgHeight() - 12}
          class="stroke-zinc-700"
          stroke-width={1}
        />
        <text
          x={svgWidth() - 4}
          y={svgHeight() - 2}
          class="fill-zinc-600 font-mono text-[9px]"
          text-anchor="end"
        >
          t={props.currentTime}
        </text>
      </svg>
    </div>
  );
}
