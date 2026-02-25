import { onMount, onCleanup, createEffect } from "solid-js";

interface RewardCurveProps {
  ppoRewards: number[];
  baselineRewards: number[];
}

export default function RewardCurve(props: RewardCurveProps) {
  let canvasRef: HTMLCanvasElement | undefined;

  function draw() {
    const canvas = canvasRef;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const pad = { top: 20, right: 16, bottom: 28, left: 48 };
    const plotW = w - pad.left - pad.right;
    const plotH = h - pad.top - pad.bottom;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Gather all values to find range
    const allValues = [...props.ppoRewards, ...props.baselineRewards];
    if (allValues.length === 0) {
      ctx.fillStyle = "#52525b";
      ctx.font = "12px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Waiting for training data...", w / 2, h / 2);
      return;
    }

    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);
    const range = maxVal - minVal || 1;
    const maxEpisodes = Math.max(props.ppoRewards.length, props.baselineRewards.length);

    // Axis
    ctx.strokeStyle = "#3f3f46";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Y-axis labels
    ctx.fillStyle = "#71717a";
    ctx.font = "9px JetBrains Mono, monospace";
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) {
      const val = minVal + (range * i) / 4;
      const y = pad.top + plotH - (plotH * i) / 4;
      ctx.fillText(val.toFixed(0), pad.left - 6, y + 3);
    }

    // X-axis label
    ctx.fillStyle = "#52525b";
    ctx.textAlign = "center";
    ctx.fillText("episode", w / 2, h - 4);

    function drawLine(data: number[], color: string) {
      if (data.length < 2) return;
      ctx!.strokeStyle = color;
      ctx!.lineWidth = 1.5;
      ctx!.beginPath();
      for (let i = 0; i < data.length; i++) {
        const x = pad.left + (plotW * i) / (maxEpisodes - 1 || 1);
        const y = pad.top + plotH - (plotH * (data[i] - minVal)) / range;
        if (i === 0) ctx!.moveTo(x, y);
        else ctx!.lineTo(x, y);
      }
      ctx!.stroke();
    }

    // Baseline (dashed)
    if (props.baselineRewards.length > 0) {
      ctx.setLineDash([4, 4]);
      drawLine(props.baselineRewards, "#71717a");
      ctx.setLineDash([]);
    }

    // PPO (solid)
    drawLine(props.ppoRewards, "#a78bfa");

    // Legend
    ctx.font = "10px JetBrains Mono, monospace";
    const legendY = pad.top - 6;

    ctx.fillStyle = "#a78bfa";
    ctx.fillRect(pad.left, legendY - 6, 12, 2);
    ctx.fillText("PPO", pad.left + 16, legendY);

    ctx.fillStyle = "#71717a";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pad.left + 60, legendY - 5);
    ctx.lineTo(pad.left + 72, legendY - 5);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillText("Round-Robin", pad.left + 76, legendY);
  }

  onMount(() => {
    draw();
    const observer = new ResizeObserver(() => draw());
    if (canvasRef) observer.observe(canvasRef);
    onCleanup(() => observer.disconnect());
  });

  createEffect(() => {
    // Track reactive deps
    props.ppoRewards.length;
    props.baselineRewards.length;
    draw();
  });

  return (
    <div class="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4">
      <h3 class="mb-3 font-mono text-xs font-medium uppercase tracking-wider text-zinc-500">
        Reward Curve
      </h3>
      <canvas
        ref={canvasRef}
        class="h-48 w-full"
        style={{ width: "100%", height: "192px" }}
      />
    </div>
  );
}
