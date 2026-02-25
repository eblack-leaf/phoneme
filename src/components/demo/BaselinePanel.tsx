import type { Worker } from "../../ml/environment";
import GanttChart from "./GanttChart";

interface BaselinePanelProps {
  workers: Worker[];
  currentTime: number;
  totalReward: number | null;
}

export default function BaselinePanel(props: BaselinePanelProps) {
  return (
    <div>
      <GanttChart
        workers={props.workers}
        currentTime={props.currentTime}
        title="Baseline (Round-Robin)"
      />
      {props.totalReward !== null && (
        <div class="mt-2 text-right font-mono text-xs text-zinc-500">
          Last baseline reward: {props.totalReward.toFixed(1)}
        </div>
      )}
    </div>
  );
}
