import { onMount, onCleanup } from "solid-js";

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
interface NNAnnotation { x: number; y: number; text: string; align?: CanvasTextAlign; }

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
    { x: inX, y: 0.18, text: "INPUT FEATURES" },
    { x: hX, y: 0.13, text: "DENSE(64, ReLU)" },
    { x: oX, y: 0.25, text: "ACTOR / CRITIC" },
    { x: aX, y: 0.25, text: "ATTENTION" },
    { x: 0.25, y: 0.82, text: "wᵢⱼ ← wᵢⱼ − α·∂L/∂wᵢⱼ" },
    { x: 0.55, y: 0.82, text: "σ(z) = max(0, z)" },
    { x: 0.80, y: 0.82, text: "softmax(QKᵀ/√d)·V" },
    { x: 0.25, y: 0.88, text: "L = −Ê[min(rₜAₜ, clip(rₜ)Aₜ)]", align: "center" },
    { x: 0.60, y: 0.88, text: "Aₜ = δₜ + (γλ)δₜ₊₁ + ..." },
    { x: 0.12, y: 0.75, text: "∇θ J(θ)", align: "center" },
    { x: 0.85, y: 0.75, text: "ε = 0.2", align: "center" },
  ];

  return { nodes, edges, annotations };
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
  const step = Math.max(3, Math.round(5 * scale));
  const buffer = 3;
  const reach = Math.max(10, Math.round(18 * scale));
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      // Skip if this pixel IS text
      if (data[(y * w + x) * 4] > 128) continue;

      // Find closest distance to any text pixel
      let closestDist = reach + 1;
      const searchR = reach;
      outer:
      for (let dy = -searchR; dy <= searchR; dy += 3) {
        for (let dx = -searchR; dx <= searchR; dx += 3) {
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
  const haloStep = 14;
  for (let y = 0; y < h; y += haloStep) {
    for (let x = 0; x < w; x += haloStep) {
      if (data[(y * w + x) * 4] > 128) continue;
      const radius = 30;
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
  let animId: number;

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

      // Normalized origin: center, slightly above middle
      const originNX = 0.5;
      const originNY = 0.47;
      const clusterR = 0.06; // normalized radius

      const windAngle = -0.3;
      const windN = 0.35; // normalized wind strength

      particles = targets.map((tgt) => {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * clusterR;
        const nsx = originNX + Math.cos(a) * r;
        const nsy = originNY + Math.sin(a) * r;

        const noiseScale = 4; // noise on normalized coords
        const n1 = fbm(tgt.nx * noiseScale + 5.1, tgt.ny * noiseScale + 2.3) * 2 - 1;
        const n2 = fbm(tgt.nx * noiseScale + 11.7, tgt.ny * noiseScale + 8.9) * 2 - 1;

        const dx = tgt.nx - nsx;
        const dy = tgt.ny - nsy;
        const len = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const px = -dy / len;
        const py = dx / len;
        const curveMag = len * 0.4;

        // Control point offsets from the straight line (normalized)
        const nc1dx = dx * 0.25 + Math.cos(windAngle) * windN * 0.3 + px * n1 * curveMag * 0.3 - dx * 0.25;
        const nc1dy = dy * 0.25 + Math.sin(windAngle) * windN * 0.3 + py * n1 * curveMag * 0.3 - dy * 0.25;
        const nc2dx = dx * 0.7 + px * n2 * curveMag * 0.6 - dx * 0.7;
        const nc2dy = dy * 0.7 + py * n2 * curveMag * 0.6 - dy * 0.7;

        // Wait, let me think about this more simply.
        // c1 = start + (target-start)*0.25 + wind + noise_perp
        // In normalized space, c1_normalized = nsx + dx*0.25 + windX + perpX
        // The offset from the lerp point is: windX + perpX
        // Store those offsets so on resize we just recompute c1 = nsx + dx*0.25 + offset

        return {
          x: 0, y: 0,
          ntx: tgt.nx, nty: tgt.ny,
          nsx, nsy,
          // Store the full control point offsets from start
          nc1dx: Math.cos(windAngle) * windN * 0.3 + px * n1 * curveMag * 0.3,
          nc1dy: Math.sin(windAngle) * windN * 0.3 + py * n1 * curveMag * 0.3,
          nc2dx: px * n2 * curveMag * 0.6,
          nc2dy: py * n2 * curveMag * 0.6,
          glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          size: Math.max(6, Math.min(W, 1400) / 1400 * 9 + Math.random() * 4),
          phase: Math.random() * Math.PI * 2,
          alpha: 0.45 + Math.random() * 0.55,
          delay: Math.random() * 600,
          rotation: 0,
        };
      });
    }

    // On resize: the word is always centered at (0.5, 0.5) in normalized space
    // and the font scales with width, so normalized positions stay roughly correct.
    // We don't resample — just let the existing normalized coords render at the
    // new pixel dimensions. The word shape in normalized space barely changes.
    function remapParticles() {
      // No-op: normalized coords (0-1) naturally adapt to new W/H.
      // The word center is always (0.5, 0.5) so particles stay in the right place.
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

      const { nodes, edges, annotations } = diagram;
      const edgeCount = Math.floor(edges.length * t);
      const annotCount = Math.floor(annotations.length * t);

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
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.label, nx, ny);
      }

      for (let i = 0; i < annotCount; i++) {
        const a = annotations[i];
        const annotProgress = Math.min(1, (t - (i / annotations.length)) * annotations.length * 1.5);
        if (annotProgress <= 0) continue;
        ctx.globalAlpha = 0.4 * annotProgress;
        ctx.fillStyle = "#d6d3d1";
        ctx.font = '14px "JetBrains Mono", monospace';
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
    onCleanup(() => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
    });
  });

  return (
    <div class="relative h-screen w-full overflow-hidden bg-zinc-950">
      <canvas ref={canvasRef} class="absolute inset-0" />
    </div>
  );
}
