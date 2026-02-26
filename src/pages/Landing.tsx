import {onMount, onCleanup, createSignal, createEffect} from "solid-js";
import { A } from "@solidjs/router";
import { useNavigate, useLocation } from "@solidjs/router";

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

function cubicBezierTangent(t: number, p0: number, p1: number, p2: number, p3: number): number {
  const u = 1 - t;
  return 3 * u * u * (p1 - p0) + 6 * u * t * (p2 - p1) + 3 * t * t * (p3 - p2);
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
  rotation: number;
}

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

  const annotations: NNAnnotation[] = [
    // Layer labels — above each column
    { x: inX, y: 0.17, text: "INPUT FEATURES" },
    { x: hX, y: 0.12, text: "DENSE(64, ReLU)" },
    { x: oX, y: 0.24, text: "ACTOR / CRITIC" },
    { x: aX, y: 0.24, text: "ATTENTION" },
    // Bottom equations — spread across 3 rows to avoid clumping at narrow widths
    { x: 0.15, y: 0.76, text: "∇θ J(θ)", align: "center" },
    { x: 0.50, y: 0.76, text: "σ(z) = max(0, z)", align: "center" },
    { x: 0.85, y: 0.76, text: "ε = 0.2", align: "center" },
    { x: 0.20, y: 0.82, text: "wᵢⱼ ← wᵢⱼ − α·∂L/∂wᵢⱼ", align: "center" },
    { x: 0.72, y: 0.82, text: "softmax(QKᵀ/√d)·V", align: "center" },
    { x: 0.20, y: 0.88, text: "L = −Ê[min(rₜAₜ, clip(rₜ)Aₜ)]", align: "center" },
    { x: 0.72, y: 0.88, text: "Aₜ = δₜ + (γλ)δₜ₊₁ + ...", align: "center" },
  ];

  // Weight labels scattered near select edges
  const weights: NNWeight[] = [
    { x: (inX + hX) / 2 - 0.02, y: 0.26, text: "0.73" },
    { x: (inX + hX) / 2 + 0.03, y: 0.42, text: "−0.41" },
    { x: (inX + hX) / 2 - 0.01, y: 0.58, text: "1.08" },
    { x: (hX + oX) / 2 + 0.02, y: 0.30, text: "0.22" },
    { x: (hX + oX) / 2 - 0.02, y: 0.50, text: "−0.67" },
    { x: (hX + oX) / 2 + 0.01, y: 0.62, text: "0.95" },
    { x: (oX + aX) / 2, y: 0.38, text: "0.54" },
    { x: (oX + aX) / 2 - 0.01, y: 0.56, text: "−0.33" },
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
  const step = Math.max(4, Math.round(8 * scale));
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
      for (let dy = -searchR; dy <= searchR; dy += 6) {
        for (let dx = -searchR; dx <= searchR; dx += 6) {
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
  const haloStep = 20;
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
      if (nearText && Math.random() < 0.25) points.push({ nx: x / w, ny: y / h });
    }
  }

  return points;
}

// --- Component ---
export default function Landing() {
  let canvasRef: HTMLCanvasElement | undefined;
  let scrollRef: HTMLDivElement | undefined;
  let secondRef: HTMLDivElement | undefined;
  let thirdRef: HTMLDivElement | undefined;
  let animId: number;
  const [chevronVisible, setChevronVisible] = createSignal(false);

  function scrollToNext() {
    secondRef?.scrollIntoView({ behavior: "smooth" });
  }

  function scrollToUseCases() {
    thirdRef?.scrollIntoView({ behavior: "smooth" });
  }

  const navigate = useNavigate();
  const location = useLocation();

  onMount(() => {
    const canvas = canvasRef!;
    const ctx = canvas.getContext("2d")!;

    let W: number, H: number, dpr: number;
    let particles: Particle[] = [];
    let startTime = 0;
    let built = false;
    const DURATION = 3000;

    const diagram = buildDiagram();
    const DIAGRAM_DELAY = 3400;
    const DIAGRAM_DRAW_DURATION = 2500;

    function sizeCanvas() {
      dpr = window.devicePixelRatio || 1;
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + "px";
      canvas.style.height = H + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
          rotation: 0,
        };
      });
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

    function getTangent(p: Particle, t: number): { tdx: number; tdy: number } {
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
        tdx: cubicBezierTangent(t, sx, c1x, c2x, tx),
        tdy: cubicBezierTangent(t, sy, c1y, c2y, ty),
      };
    }

    function drawDiagram(elapsed: number) {
      const diagramElapsed = elapsed - DIAGRAM_DELAY;
      if (diagramElapsed <= 0) return;

      const progress = Math.min(1, diagramElapsed / DIAGRAM_DRAW_DURATION);
      const t = progress * progress * (3 - 2 * progress);

      const { nodes, edges, annotations, weights } = diagram;
      const edgeCount = Math.floor(edges.length * t);
      const annotCount = Math.floor(annotations.length * t);
      const weightCount = Math.floor(weights.length * Math.min(1, t * 1.2));

      // Responsive font sizes
      const annotFontSize = Math.max(11, Math.min(16, W * 0.012));
      const weightFontSize = Math.max(8, Math.min(11, W * 0.008));
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
        ctx.globalAlpha = 0.28 * wtProgress;
        ctx.fillStyle = "#d6d3d1";
        ctx.font = `${weightFontSize}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(wt.text, wt.x * W, wt.y * H);
      }

      for (let i = 0; i < annotCount; i++) {
        const a = annotations[i];
        const annotProgress = Math.min(1, (t - (i / annotations.length)) * annotations.length * 1.5);
        if (annotProgress <= 0) continue;
        ctx.globalAlpha = 0.4 * annotProgress;
        ctx.fillStyle = "#d6d3d1";
        const size = a.size || annotFontSize;
        ctx.font = `${size}px "JetBrains Mono", monospace`;
        ctx.textAlign = a.align || "center";
        ctx.textBaseline = "top";
        ctx.fillText(a.text, a.x * W, a.y * H);
      }

      ctx.globalAlpha = 1;
    }

    function draw(now: number) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, W, H);

      drawDiagram(elapsed);

      for (const p of particles) {
        const rawT = Math.max(0, Math.min(1, (elapsed - p.delay) / DURATION));
        const t = easeInOutQuart(rawT);

        const pos = getPixelCoords(p, t);
        p.x = pos.x;
        p.y = pos.y;

        const tan = getTangent(p, t);
        p.rotation = Math.atan2(tan.tdy, tan.tdx);

        const fadeIn = Math.min(1, rawT * 4);

        let drawX = p.x;
        let drawY = p.y;
        let drawRot = p.rotation;
        if (rawT >= 1) {
          // Settled: use target directly (in case resize moved it)
          drawX = p.ntx * W + Math.sin(now * 0.0008 + p.phase) * 0.6;
          drawY = p.nty * H + Math.cos(now * 0.001 + p.phase) * 0.5;
          const settledTime = (elapsed - p.delay - DURATION) * 0.002;
          drawRot = p.rotation * (1 - Math.min(1, settledTime));
        }

        ctx.save();
        ctx.translate(drawX, drawY);
        ctx.rotate(drawRot * 0.3);
        ctx.globalAlpha = p.alpha * fadeIn;
        ctx.font = `${p.size}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#d6d3d1";
        ctx.fillText(p.glyph, 0, 0);
        ctx.restore();
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
        startTime = performance.now();
        built = true;
      } else {
        // Remap particle targets to new word position without restarting
        remapParticles();
      }
    }

    handleResize();
    animId = requestAnimationFrame(draw);

    window.addEventListener("resize", handleResize);

    // Hash-based scroll on load
    if (window.location.hash === "#use-cases") {
      setTimeout(() => {
        thirdRef?.scrollIntoView({ behavior: "instant" });
      }, 100);
    }

    const observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) {
              if (location.hash !== "#use-cases") {
                navigate("#use-cases", { replace: true });
              }
            } else if (location.hash === "#use-cases") {
              navigate(".", { replace: true });
            }
          }
        },
        { threshold: 0.3 }
    );

    if (thirdRef) observer.observe(thirdRef);

    onCleanup(() => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
    });
  });

  return (
    <div
      ref={scrollRef}
      class="h-screen w-full overflow-y-auto bg-zinc-950"
      style="scroll-snap-type: y mandatory;"
    >
      {/* Hero section */}
      <div class="relative h-screen w-full shrink-0" style="scroll-snap-align: start;">
        <canvas ref={canvasRef} class="absolute inset-0" />

        {/* Chevron */}
        <button
          onClick={scrollToNext}
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 transition-opacity duration-700 cursor-pointer"
          classList={{ "opacity-0 pointer-events-none": !chevronVisible(), "opacity-100": chevronVisible() }}
          style="z-index: 10;"
        >
          <span
            class="text-stone-400 text-xs tracking-[0.2em] uppercase"
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
            class="text-stone-400 animate-bounce"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Explore section */}
      <div
        ref={secondRef}
        class="relative min-h-screen w-full shrink-0 flex items-center justify-center px-6 py-20"
        style="scroll-snap-align: start;"
      >
        <div class="max-w-2xl w-full" style='font-family: "JetBrains Mono", monospace;'>
          {/* Dictionary entry */}
          <div class="mb-16">
            <h2 class="text-stone-200 text-3xl sm:text-4xl font-bold tracking-tight mb-1">
              phoneme
            </h2>
            <p class="text-stone-500 text-sm mb-4">/ˈfoʊ.niːm/&ensp;<span class="italic">noun</span></p>
            <div class="border-l-2 border-stone-700 pl-4">
              <p class="text-stone-400 text-sm leading-relaxed">
                The smallest unit of sound in a language that distinguishes one word from another.
              </p>
              <p class="text-stone-600 text-xs mt-2 italic">
                e.g. the /p/ in "pat" vs the /b/ in "bat"
              </p>
            </div>
          </div>

          {/* Project description */}
          <div class="space-y-5 text-stone-400 text-sm leading-relaxed">
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

        {/* Chevron to use cases */}
        <button
          onClick={scrollToUseCases}
          class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
          style="z-index: 10;"
        >
          <span
            class="text-stone-400 text-xs tracking-[0.2em] uppercase"
            style='font-family: "JetBrains Mono", monospace;'
          >
            Use Cases
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
            class="text-stone-400 animate-bounce"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Use Cases section */}
      <div
        ref={thirdRef}
        class="relative min-h-screen w-full shrink-0 flex flex-col items-center justify-center px-6 py-20"
        style="scroll-snap-align: start;"
      >
        <h2
          class="text-stone-200 text-2xl sm:text-3xl font-bold tracking-tight mb-16 text-center"
          style='font-family: "JetBrains Mono", monospace;'
        >
          USE CASES
        </h2>

        <div class="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div>
            <div
              class="border border-stone-800 rounded-lg p-6 bg-zinc-950/80"
              style='font-family: "JetBrains Mono", monospace;'
            >
              {/* LSTM + PPO diagram */}
              <svg viewBox="0 0 220 140" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
                {/* Input nodes */}
                <circle cx="30" cy="35" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="30" cy="60" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="30" cy="85" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="30" y="108" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">IR feat.</text>

                {/* Connections input → LSTM */}
                <line x1="35" y1="35" x2="63" y2="50" stroke="#44403c" stroke-width="0.8" />
                <line x1="35" y1="60" x2="63" y2="60" stroke="#44403c" stroke-width="0.8" />
                <line x1="35" y1="85" x2="63" y2="70" stroke="#44403c" stroke-width="0.8" />

                {/* LSTM cell */}
                <rect x="65" y="42" width="40" height="35" rx="4" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="85" y="64" text-anchor="middle" fill="#a8a29e" font-size="10" font-family="JetBrains Mono, monospace">LSTM</text>
                {/* Recurrence arrow */}
                <path d="M105 55 Q115 55 115 42 Q115 25 85 25 Q65 25 65 45" fill="none" stroke="#78716c" stroke-width="0.8" />
                <polygon points="65,43 62,37 68,37" fill="#78716c" />

                {/* Connections LSTM → heads */}
                <line x1="105" y1="52" x2="130" y2="42" stroke="#44403c" stroke-width="0.8" />
                <line x1="105" y1="68" x2="130" y2="80" stroke="#44403c" stroke-width="0.8" />

                {/* Policy head */}
                <circle cx="135" cy="42" r="8" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="135" y="46" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">π</text>
                <text x="135" y="26" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">policy</text>

                {/* Value head */}
                <circle cx="135" cy="80" r="8" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="135" y="84" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">V</text>
                <text x="135" y="100" text-anchor="middle" fill="#78716c" font-size="8" font-family="JetBrains Mono, monospace">value</text>

                {/* Arrow to action */}
                <line x1="143" y1="42" x2="163" y2="58" stroke="#44403c" stroke-width="0.8" />
                <line x1="143" y1="80" x2="163" y2="64" stroke="#44403c" stroke-width="0.8" />
                <rect x="163" y="50" width="48" height="22" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="187" y="65" text-anchor="middle" fill="#a8a29e" font-size="8" font-family="JetBrains Mono, monospace">pass sel.</text>
              </svg>

              <h3 class="text-stone-200 text-sm font-bold mb-2">LLVM Pass Optimization</h3>
              <p class="text-stone-500 text-xs leading-relaxed mb-3">
                LSTM + PPO online learning. Input: IR features extracted per function.
                Reward signal: measured speedup vs. <span class="text-stone-400">-O3</span>. Learns a
                per-program pass ordering policy on-device.
              </p>
              <A
                href="/work/llvm"
                class="inline-flex items-center gap-1.5 text-stone-400 text-xs hover:text-stone-200 transition-colors"
              >
                View project
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </A>
            </div>
          </div>

          {/* Card 2 */}
          <div>
            <div
              class="border border-stone-800 rounded-lg p-6 bg-zinc-950/80"
              style='font-family: "JetBrains Mono", monospace;'
            >
              {/* Text classifier diagram */}
              <svg viewBox="0 0 200 150" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
                {/* Embedding block */}
                <rect x="8" y="40" width="35" height="45" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="25" y="67" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">embed</text>

                {/* Arrow */}
                <line x1="43" y1="62" x2="55" y2="62" stroke="#44403c" stroke-width="0.8" />

                {/* Conv1D layer 1 */}
                <rect x="55" y="35" width="32" height="55" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="71" y="59" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">conv</text>
                <text x="71" y="72" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">1D</text>

                <line x1="87" y1="62" x2="100" y2="62" stroke="#44403c" stroke-width="0.8" />

                {/* Conv1D layer 2 */}
                <rect x="100" y="40" width="30" height="45" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="115" y="59" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">conv</text>
                <text x="115" y="72" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">1D</text>

                <line x1="130" y1="62" x2="143" y2="62" stroke="#44403c" stroke-width="0.8" />

                {/* Dense */}
                <rect x="143" y="45" width="30" height="35" rx="3" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="158" y="67" text-anchor="middle" fill="#a8a29e" font-size="9" font-family="JetBrains Mono, monospace">dense</text>

                <line x1="173" y1="62" x2="183" y2="62" stroke="#44403c" stroke-width="0.8" />

                {/* Output classes */}
                <circle cx="190" cy="40" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="190" cy="62" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="190" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <line x1="183" y1="62" x2="185" y2="40" stroke="#44403c" stroke-width="0.8" />
                <line x1="183" y1="62" x2="185" y2="84" stroke="#44403c" stroke-width="0.8" />
                <text x="190" y="106" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">classes</text>
              </svg>

              <h3 class="text-stone-200 text-sm font-bold mb-2">On-Device Text Classification</h3>
              <p class="text-stone-500 text-xs leading-relaxed">
                Small CNN or lightweight transformer for local intent detection and spam
                filtering. Runs entirely on-device — no data leaves, no cloud inference.
                Fine-tune on user-specific patterns without exfiltrating training data.
              </p>
              <A
                href="/work/text-classification"
                class="inline-flex items-center gap-1.5 text-stone-400 text-xs hover:text-stone-200 transition-colors mt-3"
              >
                View project
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </A>
            </div>
          </div>

          {/* Card 3 */}
          <div>
            <div
              class="border border-stone-800 rounded-lg p-6 bg-zinc-950/80"
              style='font-family: "JetBrains Mono", monospace;'
            >
              {/* Autoencoder diagram */}
              <svg viewBox="0 0 200 150" class="w-full mb-4" xmlns="http://www.w3.org/2000/svg">
                {/* Input */}
                <circle cx="18" cy="30" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="18" cy="52" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="18" cy="74" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="18" cy="96" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="18" y="118" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">input</text>

                {/* Encoder narrowing */}
                {["30","52","74","96"].map(y => <>
                  <line x1="23" y1={y} x2="53" y2="42" stroke="#44403c" stroke-width="0.5" />
                  <line x1="23" y1={y} x2="53" y2="63" stroke="#44403c" stroke-width="0.5" />
                  <line x1="23" y1={y} x2="53" y2="84" stroke="#44403c" stroke-width="0.5" />
                </>)}
                <circle cx="58" cy="42" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="58" cy="63" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="58" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="40" y="118" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">encoder</text>

                {/* To bottleneck */}
                <line x1="63" y1="42" x2="93" y2="53" stroke="#44403c" stroke-width="0.5" />
                <line x1="63" y1="63" x2="93" y2="63" stroke="#44403c" stroke-width="0.5" />
                <line x1="63" y1="84" x2="93" y2="73" stroke="#44403c" stroke-width="0.5" />

                {/* Bottleneck */}
                <circle cx="100" cy="53" r="5" fill="none" stroke="#a8a29e" stroke-width="1.2" />
                <circle cx="100" cy="73" r="5" fill="none" stroke="#a8a29e" stroke-width="1.2" />
                <text x="100" y="28" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">latent</text>

                {/* Decoder widening */}
                <line x1="105" y1="53" x2="137" y2="42" stroke="#44403c" stroke-width="0.5" />
                <line x1="105" y1="63" x2="137" y2="63" stroke="#44403c" stroke-width="0.5" />
                <line x1="105" y1="73" x2="137" y2="84" stroke="#44403c" stroke-width="0.5" />
                <circle cx="142" cy="42" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="142" cy="63" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="142" cy="84" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="160" y="118" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">decoder</text>

                {/* To reconstruction */}
                {["42","63","84"].map(y => <>
                  <line x1="147" y1={y} x2="175" y2="30" stroke="#44403c" stroke-width="0.5" />
                  <line x1="147" y1={y} x2="175" y2="52" stroke="#44403c" stroke-width="0.5" />
                  <line x1="147" y1={y} x2="175" y2="74" stroke="#44403c" stroke-width="0.5" />
                  <line x1="147" y1={y} x2="175" y2="96" stroke="#44403c" stroke-width="0.5" />
                </>)}
                <circle cx="182" cy="30" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="182" cy="52" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="182" cy="74" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <circle cx="182" cy="96" r="5" fill="none" stroke="#a8a29e" stroke-width="1" />
                <text x="182" y="118" text-anchor="middle" fill="#78716c" font-size="9" font-family="JetBrains Mono, monospace">recon.</text>
              </svg>

              <h3 class="text-stone-200 text-sm font-bold mb-2">Sensor Anomaly Detection</h3>
              <p class="text-stone-500 text-xs leading-relaxed">
                Autoencoder trained on-device for edge IoT. Learns normal sensor patterns
                during a calibration window, then flags deviations in real-time.
                No labeled data required — reconstruction error is the anomaly signal.
              </p>
              <A
                href="/work/anomaly-detection"
                class="inline-flex items-center gap-1.5 text-stone-400 text-xs hover:text-stone-200 transition-colors mt-3"
              >
                View project
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </A>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
