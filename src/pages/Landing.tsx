import { onMount, onCleanup, createSignal } from "solid-js";
import { A } from "@solidjs/router";

const GLYPHS = [
  "ə", "ʃ", "θ", "ð", "ŋ", "ʒ", "ɪ", "æ", "ʊ", "ɔ",
  "ɑ", "ɛ", "ɹ", "ɾ", "ʔ", "β", "ɸ", "ɣ", "χ", "ħ",
  "p", "b", "t", "d", "k", "g", "f", "v", "s", "z",
  "m", "n", "l", "r", "w", "j", "h", "a", "e", "i",
  "o", "u", "ʰ", "ˈ", "ˌ", "ː",
];

// --- Noise ---
function hash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) / 2147483648;
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  return hash(ix, iy) * (1 - sx) * (1 - sy) +
         hash(ix + 1, iy) * sx * (1 - sy) +
         hash(ix, iy + 1) * (1 - sx) * sy +
         hash(ix + 1, iy + 1) * sx * sy;
}

function fbm(x: number, y: number): number {
  return smoothNoise(x, y) * 0.6 + smoothNoise(x * 2.1, y * 2.1) * 0.4;
}

// --- Bezier math ---
function cubicBezier(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

function easeInOutQuart(t: number): number {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
}

// --- Particle with normalized targets ---
interface Particle {
  // Current draw position (pixels, computed each frame)
  x: number; y: number;
  // Target — normalized 0-1, recomputed on resize
  ntx: number; nty: number;
  // Start — normalized 0-1
  nsx: number; nsy: number;
  // Bezier control offsets from straight line (normalized, stable across resizes)
  // Stored as offsets so they scale with viewport
  nc1dx: number; nc1dy: number;
  nc2dx: number; nc2dy: number;
  glyph: string;
  size: number;
  phase: number;
  alpha: number;
  delay: number;
  colorIdx: number;
  atlasKey: string;
}

// Orange-to-yellow gradient palette for particles (left → right)
const GLYPH_PALETTE = [
  "#c2410c", // orange-700
  "#ea580c", // orange-600
  "#f97316", // orange-500
  "#fb923c", // orange-400
  "#f59e0b", // amber-500
  "#fbbf24", // amber-400
  "#fcd34d", // amber-300
  "#fde68a", // amber-200
];

// --- Neural network diagram ---
interface NNNode { x: number; y: number; label: string; r: number; }
interface NNEdge { from: number; to: number; }
interface NNAnnotation { x: number; y: number; text: string; align?: CanvasTextAlign; size?: number; }
interface NNWeight { x: number; y: number; text: string; }

function buildDiagram() {
  const nodes: NNNode[] = [];
  const inX = 0.12;
  for (let i = 0; i < 4; i++) nodes.push({ x: inX, y: 0.28 + i * 0.14, label: `x${i}`, r: 6 });
  const hX = 0.38;
  for (let i = 0; i < 5; i++) nodes.push({ x: hX, y: 0.21 + i * 0.14, label: `h${i}`, r: 6 });
  const oX = 0.64;
  for (let i = 0; i < 3; i++) nodes.push({ x: oX, y: 0.35 + i * 0.14, label: `y${i}`, r: 6 });
  const aX = 0.85;
  for (let i = 0; i < 3; i++) nodes.push({ x: aX, y: 0.35 + i * 0.14, label: `a${i}`, r: 5 });

  const edges: NNEdge[] = [];
  for (let i = 0; i < 4; i++) for (let j = 4; j < 9; j++) edges.push({ from: i, to: j });
  for (let i = 4; i < 9; i++) for (let j = 9; j < 12; j++) edges.push({ from: i, to: j });
  for (let i = 9; i < 12; i++) for (let j = 12; j < 15; j++) edges.push({ from: i, to: j });

  const annotations: NNAnnotation[] = [];

  // Weight labels scattered near select edges
  const weights: NNWeight[] = [
    // input → hidden
    { x: (inX + hX) / 2 - 0.03, y: 0.23, text: "0.73" },
    { x: (inX + hX) / 2 + 0.02, y: 0.33, text: "−0.41" },
    { x: (inX + hX) / 2 - 0.02, y: 0.44, text: "1.08" },
    { x: (inX + hX) / 2 + 0.03, y: 0.55, text: "0.31" },
    { x: (inX + hX) / 2 - 0.01, y: 0.64, text: "−0.79" },
    { x: (inX + hX) / 2 + 0.01, y: 0.74, text: "0.52" },
    // hidden → output
    { x: (hX + oX) / 2 + 0.02, y: 0.27, text: "0.22" },
    { x: (hX + oX) / 2 - 0.03, y: 0.38, text: "−0.67" },
    { x: (hX + oX) / 2 + 0.01, y: 0.50, text: "0.95" },
    { x: (hX + oX) / 2 - 0.01, y: 0.60, text: "−0.18" },
    { x: (hX + oX) / 2 + 0.02, y: 0.70, text: "0.84" },
    // output → attention
    { x: (oX + aX) / 2 + 0.01, y: 0.33, text: "0.54" },
    { x: (oX + aX) / 2 - 0.02, y: 0.49, text: "−0.33" },
    { x: (oX + aX) / 2 + 0.01, y: 0.62, text: "0.71" },
  ];

  return { nodes, edges, annotations, weights };
}

// --- Sample word boundary as normalized points (0-1) ---
function sampleWordBoundaryNormalized(w: number, h: number): { nx: number; ny: number }[] {
  const offscreen = document.createElement("canvas");
  const octx = offscreen.getContext("2d")!;
  const fontSize = Math.min(w * 0.18, 140);
  offscreen.width = w;
  offscreen.height = h;

  octx.fillStyle = "#000";
  octx.fillRect(0, 0, w, h);
  octx.font = `700 ${fontSize}px "JetBrains Mono", monospace`;
  octx.textAlign = "center";
  octx.textBaseline = "middle";
  octx.fillStyle = "#fff";
  octx.fillText("Phoneme", w / 2, h / 2);

  const imageData = octx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const points: { nx: number; ny: number }[] = [];

  // Place particles near text with a scaled buffer zone
  // Buffer and reach scale with font size so interiors work at small viewports
  const scale = fontSize / 140;
  const isMobile = w < 640;
  const step = Math.max(3, Math.round(6 * scale));
  const buffer = 2;
  const reach = Math.max(8, Math.round(16 * scale));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      // Skip if this pixel IS text
      if (data[(y * w + x) * 4] > 128) continue;

      // Find the closest distance to any text pixel
      let closestDist = reach + 1;
      const searchR = reach;
      outer:
      for (let dy = -searchR; dy <= searchR; dy += 4) {
        for (let dx = -searchR; dx <= searchR; dx += 4) {
          const nx2 = x + dx, ny2 = y + dy;
          if (nx2 >= 0 && nx2 < w && ny2 >= 0 && ny2 < h) {
            if (data[(ny2 * w + nx2) * 4] > 128) {
              const d = Math.sqrt(dx * dx + dy * dy);
              if (d < closestDist) closestDist = d;
              if (closestDist <= buffer) break outer;
            }
          }
        }
      }

      // Place if in the sweet spot: past the buffer but within reach
      if (closestDist > buffer && closestDist <= reach) {
        points.push({ nx: x / w, ny: y / h });
      }
    }
  }

  // Halo particles
  const haloStep = isMobile ? 24 : 16;
  const haloChance = isMobile ? 0.2 : 0.3;
  for (let y = 0; y < h; y += haloStep) {
    for (let x = 0; x < w; x += haloStep) {
      if (data[(y * w + x) * 4] > 128) continue;
      const radius = 20;
      let nearText = false;
      for (let dy = -radius; dy <= radius && !nearText; dy += 10) {
        for (let dx = -radius; dx <= radius && !nearText; dx += 10) {
          const nx2 = x + dx, ny2 = y + dy;
          if (nx2 >= 0 && nx2 < w && ny2 >= 0 && ny2 < h) {
            if (data[(ny2 * w + nx2) * 4] > 128) nearText = true;
          }
        }
      }
      if (nearText && Math.random() < haloChance) points.push({ nx: x / w, ny: y / h });
    }
  }

  return points;
}

// --- Component ---
export default function Landing() {
  let canvasRef: HTMLCanvasElement | undefined;
  let scrollRef: HTMLDivElement | undefined;
  let heroRef: HTMLDivElement | undefined;
  let secondRef: HTMLDivElement | undefined;
  let llvmRef: HTMLDivElement | undefined;
  let textClassRef: HTMLDivElement | undefined;
  let anomalyRef: HTMLDivElement | undefined;
  let contactRef: HTMLDivElement | undefined;
  let animId: number;
  const [chevronVisible, setChevronVisible] = createSignal(false);
  function scrollToNext() { secondRef?.scrollIntoView({ behavior: "smooth" }); }
  function scrollToLLVM() { llvmRef?.scrollIntoView({ behavior: "smooth" }); }
  function scrollToTextClass() { textClassRef?.scrollIntoView({ behavior: "smooth" }); }
  function scrollToAnomaly() { anomalyRef?.scrollIntoView({ behavior: "smooth" }); }
  function scrollToContact() { contactRef?.scrollIntoView({ behavior: "smooth" }); }

  onMount(() => {
    const canvas = canvasRef!;
    const ctx = canvas.getContext("2d")!;

    let W: number, H: number, dpr: number;
    let particles: Particle[] = [];
    let startTime = 0;
    let built = false;
    let vignetteGrad: CanvasGradient | null = null;
    let lastDrawTime = 0;
    const DURATION = 3000;

    // Glyph atlas: pre-rendered bitmaps keyed by "glyph|size|colorIdx"
    let glyphAtlas = new Map<string, { canvas: HTMLCanvasElement; w: number; h: number }>();

    function buildGlyphAtlas() {
      glyphAtlas.clear();
      const seen = new Set<string>();
      for (const p of particles) {
        const key = `${p.glyph}|${p.size}|${p.colorIdx}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const offCanvas = document.createElement("canvas");
        const offCtx = offCanvas.getContext("2d")!;
        const font = `${p.size}px "JetBrains Mono", monospace`;
        offCtx.font = font;
        const metrics = offCtx.measureText(p.glyph);
        const w = Math.ceil(metrics.width) + 4;
        const h = Math.ceil(p.size) + 4;
        offCanvas.width = w * dpr;
        offCanvas.height = h * dpr;
        offCtx.scale(dpr, dpr);
        offCtx.font = font;
        offCtx.textAlign = "center";
        offCtx.textBaseline = "middle";
        offCtx.fillStyle = GLYPH_PALETTE[p.colorIdx];
        offCtx.fillText(p.glyph, w / 2, h / 2);

        glyphAtlas.set(key, { canvas: offCanvas, w, h });
      }
    }

    const diagram = buildDiagram();
    const DIAGRAM_DELAY = 3400;
    const DIAGRAM_DRAW_DURATION = 3500;
    const PULSE_START    = DIAGRAM_DELAY + DIAGRAM_DRAW_DURATION + 300; // 7200ms
    const PULSE_DURATION = 1500; // ms — per-particle swell duration (snappy so stagger reads)
    const PULSE_STAGGER  = 2000; // ms spread across ntx 0→1 (effective ~1200ms across text)
    const PULSE_SCALE    = 5;    // peak jitter multiplier (1 + PULSE_SCALE at apex)

    function sizeCanvas() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Rebuild cached vignette gradient for new dimensions
      const scaleY = 0.5;
      const vr = W * 0.30;
      vignetteGrad = ctx.createRadialGradient(W / 2, H / 2 / scaleY, 0, W / 2, H / 2 / scaleY, vr);
      vignetteGrad.addColorStop(0,    "rgba(9,9,11,1)");
      vignetteGrad.addColorStop(0.40, "rgba(9,9,11,1)");
      vignetteGrad.addColorStop(0.85, "rgba(9,9,11,0)");
      vignetteGrad.addColorStop(1,    "rgba(9,9,11,0)");
    }

    function buildParticles() {
      const targets = sampleWordBoundaryNormalized(W, H);

      // Particles enter from off-screen left as a grouped stream.
      // They're sorted by target-y so nearby particles start near each other,
      // giving a coherent river-like flow instead of random scatter.
      const sorted = targets.slice().sort((a, b) => a.ny - b.ny);

      // Stream parameters
      const streamCenterY = 0.5;    // vertical center of the stream
      const streamSpreadY = 0.18;   // how tall the stream band is
      const startXBase = -0.08;     // just off-screen left
      const startXSpread = 0.06;    // depth variation in the stream

      particles = sorted.map((tgt, i) => {
        // Map index to a position in the stream band
        const bandT = sorted.length > 1 ? i / (sorted.length - 1) : 0.5;
        const bandY = streamCenterY + (bandT - 0.5) * streamSpreadY;

        // Add noise so it's not a perfect line
        const noiseScale = 4;
        const n1 = fbm(tgt.nx * noiseScale + 5.1, tgt.ny * noiseScale + 2.3) * 2 - 1;
        const n2 = fbm(tgt.nx * noiseScale + 11.7, tgt.ny * noiseScale + 8.9) * 2 - 1;

        const nsx = startXBase + Math.random() * startXSpread + n1 * 0.03;
        const nsy = bandY + n2 * 0.04;

        // Bezier control points: sweeping rightward arc
        // c1 pushes the stream forward and slightly down/up for organic feel
        // c2 guides into the final target position
        const dx = tgt.nx - nsx;
        const dy = tgt.ny - nsy;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const px = -dy / len;
        const py = dx / len;

        // c1: keep the stream cohesive in the first third — mostly horizontal push
        const nc1dx = n1 * 0.04 + px * n1 * 0.03;
        const nc1dy = n1 * 0.02 + py * n1 * 0.03;
        // c2: fan out toward targets in the last third
        const nc2dx = px * n2 * len * 0.25;
        const nc2dy = py * n2 * len * 0.25;

        return {
          x: 0, y: 0,
          ntx: tgt.nx, nty: tgt.ny,
          nsx, nsy,
          nc1dx,
          nc1dy,
          nc2dx,
          nc2dy,
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          size: Math.max(6, Math.min(W, 1400) / 1400 * 9 + Math.random() * 4),
          phase: Math.random() * Math.PI * 2,
          alpha: 0.45 + Math.random() * 0.55,
          delay: bandT * 400 + Math.random() * 200,
          colorIdx: 0, // assigned after all particles built
          atlasKey: "",  // assigned after colorIdx is set
        };
      });

      // Assign gradient color left-to-right based on target x position
      // Left = deep orange, right = yellow
      let minX = Infinity, maxX = -Infinity;
      for (const p of particles) {
        if (p.ntx < minX) minX = p.ntx;
        if (p.ntx > maxX) maxX = p.ntx;
      }
      const rangeX = maxX - minX || 1;
      for (const p of particles) {
        const norm = (p.ntx - minX) / rangeX;
        p.colorIdx = Math.min(GLYPH_PALETTE.length - 1, Math.floor(norm * GLYPH_PALETTE.length));
        p.atlasKey = `${p.glyph}|${p.size}|${p.colorIdx}`;
      }

    }

    // On resize: resample the word boundary at the new viewport size and
    // reassign each particle to the closest new target position.
    function remapParticles() {
      const newTargets = sampleWordBoundaryNormalized(W, H);
      if (newTargets.length === 0) return;

      // Build a simple greedy closest-match assignment
      const used = new Uint8Array(newTargets.length);

      for (const p of particles) {
        let bestIdx = 0;
        let bestDist = Infinity;
        for (let i = 0; i < newTargets.length; i++) {
          if (used[i]) continue;
          const dx = newTargets[i].nx - p.ntx;
          const dy = newTargets[i].ny - p.nty;
          const d = dx * dx + dy * dy;
          if (d < bestDist) {
            bestDist = d;
            bestIdx = i;
          }
        }
        used[bestIdx] = 1;
        p.ntx = newTargets[bestIdx].nx;
        p.nty = newTargets[bestIdx].ny;
      }
    }

    // Get pixel coords from normalized particle state at time t
    function getPixelCoords(p: Particle, t: number): { x: number; y: number } {
      const sx = p.nsx * W;
      const sy = p.nsy * H;
      const tx = p.ntx * W;
      const ty = p.nty * H;
      const dx = tx - sx;
      const dy = ty - sy;
      const c1x = sx + dx * 0.25 + p.nc1dx * W;
      const c1y = sy + dy * 0.25 + p.nc1dy * H;
      const c2x = sx + dx * 0.7 + p.nc2dx * W;
      const c2y = sy + dy * 0.7 + p.nc2dy * H;

      return {
        x: cubicBezier(t, sx, c1x, c2x, tx),
        y: cubicBezier(t, sy, c1y, c2y, ty),
      };
    }

    function drawDiagram(elapsed: number) {
      const diagramElapsed = elapsed - DIAGRAM_DELAY;
      if (diagramElapsed <= 0) return;

      const progress = Math.min(1, diagramElapsed / DIAGRAM_DRAW_DURATION);
      const t = progress * progress * (3 - 2 * progress);

      const { nodes, edges, weights } = diagram;
      const edgeCount = Math.floor(edges.length * t);
      const weightCount = Math.floor(weights.length * Math.min(1, t * 1.2));

      // Responsive font sizes
      const weightFontSize = Math.max(9, Math.min(12, W * 0.009));
      const nodeFontSize = Math.max(8, Math.min(11, W * 0.008));

      ctx.lineWidth = 1;
      for (let i = 0; i < edgeCount; i++) {
        const e = edges[i];
        const from = nodes[e.from];
        const to = nodes[e.to];
        const edgeT = Math.min(1, (i / edgeCount) * 2);
        ctx.globalAlpha = 0.15 + edgeT * 0.15;
        ctx.strokeStyle = "#d6d3d1";
        ctx.beginPath();
        ctx.moveTo(from.x * W, from.y * H);
        ctx.lineTo(to.x * W, to.y * H);
        ctx.stroke();
      }

      const nodeCount = Math.floor(nodes.length * Math.min(1, t * 1.5));
      for (let i = 0; i < nodeCount; i++) {
        const n = nodes[i];
        const nx = n.x * W, ny = n.y * H;
        ctx.globalAlpha = 0.45;
        ctx.strokeStyle = "#d6d3d1";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(nx, ny, n.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#d6d3d1";
        ctx.font = `${nodeFontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, nx, ny);
      }

      // Edge weight labels
      for (let i = 0; i < weightCount; i++) {
        const wt = weights[i];
        const wtProgress = Math.min(1, (t - (i / weights.length) * 0.6) * 3);
        if (wtProgress <= 0) continue;
        ctx.globalAlpha = 0.45 * wtProgress;
        ctx.fillStyle = "#d6d3d1";
        ctx.font = `${weightFontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(wt.text, wt.x * W, wt.y * H);
      }

      // Terminal panel — top right
      const termLines: { text: string; dim: boolean }[] = [
        { text: "$ cargo run --release",  dim: false },
        { text: "──────────────────────", dim: true  },
        { text: "activation   relu",     dim: false },
        { text: "optimizer    adam",     dim: false },
        { text: "lr           1e-4",     dim: false },
        { text: "hidden    [64, 64]",    dim: false },
        { text: "dropout      0.20",     dim: false },
        { text: "──────────────────────", dim: true  },
        { text: "σ(z) = max(0,z)",       dim: false },
        { text: "∇θ J(θ)",              dim: false },
        { text: "wᵢⱼ − α·∂L/∂wᵢⱼ",    dim: false },
        { text: "clip(rₜ, 1±ε)",        dim: false },
      ];

      const termFontSize = Math.max(9, Math.min(12, W * 0.0075));
      const termLineH = termFontSize * 1.75;
      const termPad = Math.max(8, W * 0.012);
      const termX = W * 0.64;
      const termY = H * 0.05;
      const termW = W * 0.34;
      const termH = termLines.length * termLineH + termPad * 2;
      const termLineCount = Math.floor(termLines.length * Math.min(1, t * 1.4));

      ctx.globalAlpha = 0.55 * t;
      ctx.fillStyle = "rgba(9,9,11,0.88)";
      ctx.fillRect(termX, termY, termW, termH);
      ctx.globalAlpha = 0.25 * t;
      ctx.strokeStyle = "#78716c";
      ctx.lineWidth = 0.5;
      ctx.strokeRect(termX, termY, termW, termH);

      ctx.font = `${termFontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      for (let i = 0; i < termLineCount; i++) {
        const line = termLines[i];
        const lp = Math.min(1, (t - (i / termLines.length) * 0.7) * termLines.length * 1.5);
        if (lp <= 0) continue;
        ctx.globalAlpha = (line.dim ? 0.38 : 0.75) * lp;
        ctx.fillStyle = "#d6d3d1";
        ctx.fillText(line.text, termX + termPad, termY + termPad + i * termLineH);
      }

      ctx.globalAlpha = 1;
    }

    function draw(now: number) {
      // On mobile throttle to ~30fps after the intro animation settles.
      // Still queues the next frame so elapsed time stays accurate.
      const settled = now - startTime > DURATION + 800;
      if (W < 640 && settled && now - lastDrawTime < 32) {
        animId = requestAnimationFrame(draw);
        return;
      }
      lastDrawTime = now;

      const elapsed = now - startTime;
      ctx.clearRect(0, 0, W, H);

      drawDiagram(elapsed);

      // Elliptical vignette: fully opaque center, feathers to transparent.
      // scaleY < 1 squishes the circle into a short wide ellipse.
      const scaleY = 0.5;
      ctx.save();
      ctx.scale(1, scaleY);
      ctx.fillStyle = vignetteGrad!;
      ctx.fillRect(0, 0, W, H / scaleY);
      ctx.restore();

      // pulseElapsed is the same every frame — compute once outside the loop.
      // Each particle offsets by its x position so the swell travels left→right.
      const pulseElapsed = elapsed - PULSE_START;

      for (const p of particles) {
        const rawT = Math.max(0, Math.min(1, (elapsed - p.delay) / DURATION));
        const t = easeInOutQuart(rawT);

        const pos = getPixelCoords(p, t);
        p.x = pos.x;
        p.y = pos.y;

        const fadeIn = Math.min(1, rawT * 4);

        let drawX = p.x;
        let drawY = p.y;
        if (rawT >= 1) {
          const pPulse = pulseElapsed - p.ntx * PULSE_STAGGER;
          const jitterAmp = (pPulse >= 0 && pPulse < PULSE_DURATION)
            ? 1 + Math.sin((pPulse / PULSE_DURATION) * Math.PI) * PULSE_SCALE
            : 1;
          // Fade jitter in over 500ms after settling — eliminates the snap at rawT=1.
          // Scale amplitude with W so mobile stays crisp (small viewport, dense particles).
          const fadeIn  = Math.min(1, (elapsed - p.delay - DURATION) / 500);
          const jx = Math.min(W * 0.0028, 2.0) * jitterAmp * fadeIn;
          const jy = Math.min(W * 0.0022, 1.6) * jitterAmp * fadeIn;
          drawX = p.ntx * W + Math.sin(now * 0.0008 + p.phase) * jx;
          drawY = p.nty * H + Math.cos(now * 0.001 + p.phase) * jy;
        }

        const atlas = glyphAtlas.get(p.atlasKey);
        if (atlas) {
          ctx.globalAlpha = p.alpha * fadeIn;
          ctx.drawImage(atlas.canvas, 0, 0, atlas.canvas.width, atlas.canvas.height,
            drawX - atlas.w / 2, drawY - atlas.h / 2, atlas.w, atlas.h);
        }
      }

      ctx.globalAlpha = 1;

      // Show chevron after particles settle + diagram starts drawing
      if (!chevronVisible() && elapsed > DURATION + 800) {
        setChevronVisible(true);
      }

      animId = requestAnimationFrame(draw);
    }

    function handleResize() {
      sizeCanvas();
      if (!built) {
        buildParticles();
        buildGlyphAtlas();
        startTime = performance.now();
        built = true;
      } else {
        // Remap particle targets to new word position without restarting
        remapParticles();
        // Restart rAF in case it stopped (mobile settled state)
        cancelAnimationFrame(animId);
        animId = requestAnimationFrame(draw);
      }
    }

    handleResize();
    animId = requestAnimationFrame(draw);

    // Hash navigation: scroll to the section named in the URL hash
    const hash = window.location.hash;
    if      (hash === "#explore")            secondRef?.scrollIntoView({ behavior: "instant" });
    else if (hash === "#llvm")               llvmRef?.scrollIntoView({ behavior: "instant" });
    else if (hash === "#text-classification") textClassRef?.scrollIntoView({ behavior: "instant" });
    else if (hash === "#anomaly")             anomalyRef?.scrollIntoView({ behavior: "instant" });
    else if (hash === "#contact")             contactRef?.scrollIntoView({ behavior: "instant" });

    window.addEventListener("resize", handleResize);

    // Keep URL hash in sync during scroll-snap transitions.
    // A scroll event fires synchronously every frame of the snap animation,
    // so getBoundingClientRect gives us the actual visible height of each section
    // in real-time — no batching delay like IntersectionObserver.
    const sections = [
      { el: heroRef,      id: ""                   },
      { el: secondRef,    id: "explore"             },
      { el: llvmRef,      id: "llvm"                },
      { el: textClassRef, id: "text-classification" },
      { el: anomalyRef,   id: "anomaly"             },
      { el: contactRef,   id: "contact"             },
    ];
    function onSectionScroll() {
      if (!scrollRef) return;
      const cTop    = scrollRef.getBoundingClientRect().top;
      const cBottom = cTop + scrollRef.clientHeight;
      let bestVis = 0;
      let bestId  = "";
      let found   = false;
      for (const { el, id } of sections) {
        if (!el) continue;
        const r   = el.getBoundingClientRect();
        const vis = Math.max(0, Math.min(cBottom, r.bottom) - Math.max(cTop, r.top));
        if (vis > bestVis) { bestVis = vis; bestId = id; found = true; }
      }
      if (!found) return;
      if (bestId) {
        history.replaceState(null, "", "#" + bestId);
      } else if (location.hash) {
        history.replaceState(null, "", location.pathname + location.search);
      }
    }
    scrollRef!.addEventListener("scroll", onSectionScroll, { passive: true });

    onCleanup(() => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      scrollRef?.removeEventListener("scroll", onSectionScroll);
    });
  });

  return (
    <div
      ref={scrollRef}
      class="h-dvh w-full overflow-y-auto bg-zinc-950"
      style="scroll-snap-type: y mandatory;"
    >
      {/* Hero section */}
      <div ref={heroRef} class="relative h-dvh w-full shrink-0" style="scroll-snap-align: start;">
        <canvas ref={canvasRef} class="absolute inset-0" />

        {/* Chevron */}
        <button
          onClick={scrollToNext}
          class="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 transition-opacity duration-700 cursor-pointer"
          classList={{ "opacity-0 pointer-events-none": !chevronVisible(), "opacity-100": chevronVisible() }}
          style="z-index: 10; padding-bottom: env(safe-area-inset-bottom, 0px);"
        >
          <span
            class="text-amber-400 text-sm tracking-[0.2em] uppercase"
            style='font-family: "JetBrains Mono", monospace;'
          >
            Explore
          </span>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="text-amber-400 animate-bounce"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Explore section */}
      <div
        ref={secondRef}
        id="explore"
        class="min-h-dvh w-full shrink-0 flex flex-col"
        style="scroll-snap-align: start;"
      >
        <div class="flex-1 flex items-center justify-center px-6 py-8">
          <div class="max-w-3xl w-full" style='font-family: "JetBrains Mono", monospace;'>
            {/* Dictionary entry */}
            <div class="mb-8 lg:mb-16">
              <h2 class="text-orange-400 text-4xl sm:text-5xl font-bold tracking-tight mb-1">
                phoneme
              </h2>
              <p class="text-orange-700 text-base mb-4">/ˈfoʊ.niːm/&ensp;<span class="italic">noun</span></p>
              <div class="border-l-2 border-orange-800 pl-4">
                <p class="text-stone-400 text-base leading-relaxed">
                  The smallest unit of sound in a language that distinguishes one word from another.
                </p>
                <p class="text-stone-600 text-sm mt-2 italic">
                  e.g. the /p/ in "pat" vs the /b/ in "bat"
                </p>
              </div>
            </div>

            {/* Project description */}
            <div class="space-y-4 lg:space-y-5 text-stone-400 text-base leading-relaxed">
              <p>
                A phoneme is the irreducible unit of language. We apply the same principle to
                models: find the minimal architecture that solves the task, then train it
                on-device. No surplus parameters. No cloud dependency.
              </p>
              <p>
                Data never leaves the device. Training runs locally — on the hardware you
                already carry. No telemetry, no third-party inference, no round-trips to
                someone else's cluster.
              </p>
              <p>
                One task, one model, one device. The minimum viable intelligence for the job.
              </p>
            </div>
          </div>
        </div>

        {/* Chevron → LLVM */}
        <button
          onClick={scrollToLLVM}
          class="self-center flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          style="padding-bottom: max(2.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)));"
        >
          <span class="text-amber-400 text-sm tracking-[0.2em] uppercase" style='font-family: "JetBrains Mono", monospace;'>
            Use Cases
          </span>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-bounce">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── LLVM Pass Optimization ── */}
      <div
        ref={llvmRef}
        id="llvm"
        class="min-h-dvh w-full shrink-0 flex flex-col"
        style="scroll-snap-align: start;"
      >
        <div class="flex-1 flex items-center justify-center px-6 py-6 lg:py-10">
        <div class="w-full max-w-7xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16" style='font-family: "JetBrains Mono", monospace;'>
          <div class="w-full lg:w-1/2">
            <svg viewBox="-12 0 512 270" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Input features */}
              {[90,120,150,180].map(y => <circle cx="40" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="40" y="212" text-anchor="middle" fill="#78716c" font-size="14" font-family="JetBrains Mono, monospace">IR features</text>
              {/* → LSTM */}
              {[90,120,150,180].map(y => <line x1="49" y1={y} x2="138" y2="135" stroke="#44403c" stroke-width="1" />)}
              {/* LSTM cell */}
              <rect x="140" y="98" width="100" height="68" rx="6" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="190" y="130" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">LSTM</text>
              <text x="190" y="152" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">hidden: 64</text>
              {/* Recurrence */}
              <path d="M240 118 Q265 118 265 90 Q265 62 190 62 Q140 62 140 108" fill="none" stroke="#78716c" stroke-width="1" stroke-dasharray="4 3" />
              <polygon points="140,106 136,96 146,96" fill="#78716c" />
              {/* → heads */}
              <line x1="240" y1="115" x2="303" y2="90" stroke="#44403c" stroke-width="1" />
              <line x1="240" y1="151" x2="303" y2="175" stroke="#44403c" stroke-width="1" />
              {/* Policy head */}
              <circle cx="318" cy="87" r="17" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="318" y="93" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">π</text>
              <text x="318" y="62" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">policy</text>
              {/* Value head */}
              <circle cx="318" cy="178" r="17" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="318" y="185" text-anchor="middle" fill="#a8a29e" font-size="19" font-family="JetBrains Mono, monospace">V</text>
              <text x="318" y="213" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">value</text>
              {/* → pass selection */}
              <line x1="335" y1="87"  x2="398" y2="118" stroke="#44403c" stroke-width="1" />
              <line x1="335" y1="178" x2="398" y2="148" stroke="#44403c" stroke-width="1" />
              <rect x="398" y="112" width="90" height="44" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="443" y="131" text-anchor="middle" fill="#a8a29e" font-size="15" font-family="JetBrains Mono, monospace">pass</text>
              <text x="443" y="150" text-anchor="middle" fill="#a8a29e" font-size="15" font-family="JetBrains Mono, monospace">select</text>
              {/* Reward feedback */}
              <path d="M443 156 Q443 242 190 242 Q140 242 140 170" fill="none" stroke="#f97316" stroke-width="1.5" stroke-dasharray="4 3" />
              <polygon points="140,168 136,178 146,178" fill="#f97316" />
              <text x="310" y="259" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">reward: Δspeedup vs -O3</text>
            </svg>
          </div>
          <div class="w-full lg:w-1/2 space-y-6">
            <p class="text-orange-800 text-sm tracking-widest">01 / USE CASES</p>
            <h2 class="text-orange-300 text-3xl sm:text-4xl font-bold tracking-tight">LLVM Pass Optimization</h2>
            <p class="text-stone-400 text-base leading-relaxed">
              LSTM + PPO online learning. The model observes IR features extracted per
              function and learns pass orderings that outperform <span class="text-stone-300">-O3</span>.
            </p>
            <p class="text-stone-500 text-base leading-relaxed">
              Reward signal: measured runtime speedup. No labeled data — the compiler
              and hardware are the oracle. Trains entirely on-device.
            </p>
            <A href="/work/llvm" class="inline-flex items-center gap-1.5 text-orange-600 text-base hover:text-orange-400 transition-colors">
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </A>
          </div>
        </div>
        </div>
        <button
          onClick={scrollToTextClass}
          class="self-center flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          style="padding-bottom: max(2.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)));"
        >
          <span class="text-amber-400 text-sm tracking-[0.2em] uppercase" style='font-family: "JetBrains Mono", monospace;'>Text Classification</span>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-bounce">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── On-Device Text Classification ── */}
      <div
        ref={textClassRef}
        id="text-classification"
        class="min-h-dvh w-full shrink-0 flex flex-col"
        style="scroll-snap-align: start;"
      >
        <div class="flex-1 flex items-center justify-center px-6 py-6 lg:py-10">
        <div class="w-full max-w-7xl flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-16" style='font-family: "JetBrains Mono", monospace;'>
          <div class="w-full lg:w-1/2">
            <svg viewBox="0 0 515 230" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Embedding */}
              <rect x="10" y="72" width="58" height="86" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="39" y="112" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">embed</text>
              <text x="39" y="129" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">dim 64</text>
              <text x="39" y="54" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">tokens</text>
              <line x1="68" y1="115" x2="90" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Conv1D ×2 */}
              <rect x="90" y="58" width="62" height="114" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="121" y="110" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="121" y="127" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=3×128</text>
              <text x="121" y="40" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">ReLU</text>
              <line x1="152" y1="115" x2="174" y2="115" stroke="#44403c" stroke-width="1" />
              <rect x="174" y="70" width="62" height="90" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="205" y="110" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">conv1d</text>
              <text x="205" y="127" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">k=5×64</text>
              <text x="205" y="52" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">ReLU</text>
              <line x1="236" y1="115" x2="258" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Global max pool */}
              <rect x="258" y="90" width="66" height="50" rx="5" fill="none" stroke="#f97316" stroke-width="2" />
              <text x="291" y="112" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">global</text>
              <text x="291" y="128" text-anchor="middle" fill="#f97316" font-size="13" font-family="JetBrains Mono, monospace">max pool</text>
              <line x1="324" y1="115" x2="346" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Dense */}
              <rect x="346" y="96" width="54" height="38" rx="5" fill="none" stroke="#a8a29e" stroke-width="1.4" />
              <text x="373" y="121" text-anchor="middle" fill="#a8a29e" font-size="14" font-family="JetBrains Mono, monospace">dense</text>
              <line x1="400" y1="115" x2="422" y2="115" stroke="#44403c" stroke-width="1" />
              {/* Output classes */}
              {[88,115,142].map(y => <circle cx="436" cy={y} r="11" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <line x1="422" y1="115" x2="425" y2="88"  stroke="#44403c" stroke-width="1" />
              <line x1="422" y1="115" x2="425" y2="142" stroke="#44403c" stroke-width="1" />
              <text x="457" y="92"  fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">spam</text>
              <text x="457" y="119" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">intent</text>
              <text x="457" y="146" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">other</text>
            </svg>
          </div>
          <div class="w-full lg:w-1/2 space-y-6">
            <p class="text-orange-800 text-sm tracking-widest">02 / USE CASES</p>
            <h2 class="text-orange-300 text-3xl sm:text-4xl font-bold tracking-tight">On-Device Text Classification</h2>
            <p class="text-stone-400 text-base leading-relaxed">
              Small CNN for local intent detection and spam filtering.
              Runs entirely on-device — no data leaves, no cloud inference.
            </p>
            <p class="text-stone-500 text-base leading-relaxed">
              Fine-tune on user-specific patterns without exfiltrating training data.
              The model lives on the device; so does everything it learns.
            </p>
            <A href="/work/text-classification" class="inline-flex items-center gap-1.5 text-orange-600 text-base hover:text-orange-400 transition-colors">
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </A>
          </div>
        </div>
        </div>
        <button
          onClick={scrollToAnomaly}
          class="self-center flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          style="padding-bottom: max(2.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)));"
        >
          <span class="text-amber-400 text-sm tracking-[0.2em] uppercase" style='font-family: "JetBrains Mono", monospace;'>Anomaly Detection</span>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-bounce">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── Sensor Anomaly Detection ── */}
      <div
        ref={anomalyRef}
        id="anomaly"
        class="min-h-dvh w-full shrink-0 flex flex-col"
        style="scroll-snap-align: start;"
      >
        <div class="flex-1 flex items-center justify-center px-6 py-6 lg:py-10">
        <div class="w-full max-w-7xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16" style='font-family: "JetBrains Mono", monospace;'>
          <div class="w-full lg:w-1/2">
            <svg viewBox="-12 0 512 250" class="w-full" xmlns="http://www.w3.org/2000/svg">
              {/* Input sensors */}
              {[50,82,114,146,178].map(y => <circle cx="28" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="28" y="207" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">sensor x</text>
              {/* → encoder layer 1 */}
              {[50,82,114,146,178].map(y => (
                <g>
                  <line x1="36" y1={y} x2="96" y2="96"  stroke="#44403c" stroke-width="0.8" />
                  <line x1="36" y1={y} x2="96" y2="114" stroke="#44403c" stroke-width="0.8" />
                  <line x1="36" y1={y} x2="96" y2="132" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[96,114,132].map(y => <circle cx="104" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              {/* → encoder layer 2 */}
              {[96,114,132].map(y => (
                <g>
                  <line x1="112" y1={y} x2="162" y2="106" stroke="#44403c" stroke-width="0.8" />
                  <line x1="112" y1={y} x2="162" y2="122" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[106,122].map(y => <circle cx="170" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="114" y="172" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">encoder</text>
              {/* → bottleneck */}
              <line x1="178" y1="106" x2="224" y2="114" stroke="#44403c" stroke-width="0.8" />
              <line x1="178" y1="122" x2="224" y2="114" stroke="#44403c" stroke-width="0.8" />
              <circle cx="236" cy="114" r="15" fill="none" stroke="#f97316" stroke-width="2" />
              <text x="236" y="120" text-anchor="middle" fill="#f97316" font-size="14" font-family="JetBrains Mono, monospace">z</text>
              <text x="236" y="90" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">latent</text>
              {/* decoder layer 1 */}
              <line x1="250" y1="107" x2="292" y2="106" stroke="#44403c" stroke-width="0.8" />
              <line x1="250" y1="121" x2="292" y2="122" stroke="#44403c" stroke-width="0.8" />
              {[106,122].map(y => <circle cx="300" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              {/* decoder layer 2 */}
              {[106,122].map(y => (
                <g>
                  <line x1="308" y1={y} x2="356" y2="96"  stroke="#44403c" stroke-width="0.8" />
                  <line x1="308" y1={y} x2="356" y2="114" stroke="#44403c" stroke-width="0.8" />
                  <line x1="308" y1={y} x2="356" y2="132" stroke="#44403c" stroke-width="0.8" />
                </g>
              ))}
              {[96,114,132].map(y => <circle cx="364" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="334" y="172" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">decoder</text>
              {/* → reconstruction */}
              {[96,114,132].map(y => (
                <g>
                  <line x1="372" y1={y} x2="424" y2="50"  stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="82"  stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="114" stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="146" stroke="#44403c" stroke-width="0.7" />
                  <line x1="372" y1={y} x2="424" y2="178" stroke="#44403c" stroke-width="0.7" />
                </g>
              ))}
              {[50,82,114,146,178].map(y => <circle cx="432" cy={y} r="9" fill="none" stroke="#a8a29e" stroke-width="1.4" />)}
              <text x="432" y="207" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">x̂ recon.</text>
              <text x="250" y="233" text-anchor="middle" fill="#78716c" font-size="13" font-family="JetBrains Mono, monospace">anomaly score = ‖x − x̂‖²</text>
            </svg>
          </div>
          <div class="w-full lg:w-1/2 space-y-6">
            <p class="text-orange-800 text-sm tracking-widest">03 / USE CASES</p>
            <h2 class="text-orange-300 text-3xl sm:text-4xl font-bold tracking-tight">Sensor Anomaly Detection</h2>
            <p class="text-stone-400 text-base leading-relaxed">
              Autoencoder trained on-device for edge IoT. Learns normal sensor patterns
              during a calibration window, then flags deviations in real-time.
            </p>
            <p class="text-stone-500 text-base leading-relaxed">
              No labeled data required — reconstruction error is the anomaly signal.
              Works on any time-series sensor: vibration, temperature, current draw.
            </p>
            <A href="/work/anomaly-detection" class="inline-flex items-center gap-1.5 text-orange-600 text-base hover:text-orange-400 transition-colors">
              View project
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </A>
          </div>
        </div>
        </div>
        <button
          onClick={scrollToContact}
          class="self-center flex flex-col items-center gap-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
          style="padding-bottom: max(2.5rem, calc(1rem + env(safe-area-inset-bottom, 0px)));"
        >
          <span class="text-amber-400 text-sm tracking-[0.2em] uppercase" style='font-family: "JetBrains Mono", monospace;'>Work With Me</span>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-amber-400 animate-bounce">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* ── Consulting / Contact ── */}
      <div
        ref={contactRef}
        id="contact"
        class="min-h-dvh w-full shrink-0 flex items-center justify-center px-6 py-12 lg:py-20"
        style="scroll-snap-align: start;"
      >
        <div class="max-w-3xl w-full" style='font-family: "JetBrains Mono", monospace;'>
          <div class="mb-16">
            <p class="text-orange-800 text-sm tracking-widest mb-4">CONSULTING</p>
            <h2 class="text-orange-400 text-4xl sm:text-5xl font-bold tracking-tight mb-1">
              Work with me.
            </h2>
          </div>
          <div class="border-l-2 border-orange-800 pl-4 mb-12">
            <p class="text-stone-400 text-base leading-relaxed">
              One task. One model. One device.
            </p>
            <p class="text-stone-600 text-sm mt-2 italic">
              If it runs on silicon, it can run a model.
            </p>
          </div>
          <div class="space-y-5 text-stone-400 text-base leading-relaxed mb-12">
            <p>
              Have a use case, a hardware target, or a dataset you can't send to the
              cloud? I'll help you design and train the minimal model that solves it —
              on-device, private, and deployable.
            </p>
            <p>
              Embedded systems, mobile, edge IoT, custom silicon.
              Any constrained environment. Any task.
            </p>
          </div>
          <a
            href="mailto:hello@phoneme.dev"
            class="inline-flex items-center gap-2 text-orange-500 hover:text-orange-300 transition-colors text-base tracking-wide"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="4" width="20" height="16" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            hello@phoneme.dev
          </a>
        </div>
      </div>
    </div>
  );
}
