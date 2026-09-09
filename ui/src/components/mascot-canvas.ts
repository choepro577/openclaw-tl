// Canvas-only rendering for the MAAP connected-node mascot.
//
// The pose model remains shared with the existing mascot animator. Keeping
// that contract means loading, chat, and custodian surfaces retain their
// motion and mood behavior while the artwork has a neutral MAAP identity.
import type { MascotPalette, MascotPose } from "./mascot-pose.ts";

const ART_SIZE = 120;
const TAU = Math.PI * 2;
const CORE = { x: 60, y: 60 };
const NODE_GLOW = "#00D5C0";
const NODE_INK = "#F8FAFC";

type Point = { x: number; y: number };

const OUTER_NODES: readonly Point[] = [
  { x: 60, y: 20 },
  { x: 92, y: 40 },
  { x: 92, y: 80 },
  { x: 60, y: 100 },
  { x: 28, y: 80 },
  { x: 28, y: 40 },
];

const EDGES: readonly (readonly [number, number])[] = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 5],
  [5, 0],
  [0, 3],
  [1, 4],
  [2, 5],
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function radians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function rotate(point: Point, degrees: number, origin: Point = CORE): Point {
  const angle = radians(degrees);
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: origin.x + x * cosine - y * sine,
    y: origin.y + x * sine + y * cosine,
  };
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  point: Point,
  radius: number,
  fill: string,
  opacity: number,
): void {
  ctx.save();
  ctx.globalAlpha *= clamp(opacity, 0, 1);
  ctx.shadowColor = fill;
  ctx.shadowBlur = radius * 1.5;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(point.x, point.y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawSpark(ctx: CanvasRenderingContext2D, point: Point, size: number, color: string): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.1, size * 0.2);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(point.x - size, point.y);
  ctx.lineTo(point.x + size, point.y);
  ctx.moveTo(point.x, point.y - size);
  ctx.lineTo(point.x, point.y + size);
  ctx.stroke();
  ctx.restore();
}

function drawEffects(
  ctx: CanvasRenderingContext2D,
  pose: MascotPose,
  palette: MascotPalette,
): void {
  const phase = clamp(pose.effectPhase, 0, 1);
  switch (pose.effect) {
    case "none":
      return;
    case "sparkles":
      for (let index = 0; index < 5; index += 1) {
        const angle = phase * TAU + (TAU * index) / 5;
        const radius = 45 + (index % 2) * 6;
        const point = {
          x: CORE.x + Math.cos(angle) * radius,
          y: CORE.y + Math.sin(angle) * radius,
        };
        drawSpark(
          ctx,
          point,
          2.4 + ((index + phase) % 1) * 2,
          index % 2 ? NODE_GLOW : palette.antenna,
        );
      }
      return;
    case "sparks":
      for (let index = 0; index < 4; index += 1) {
        const point = {
          x: 91 + Math.cos(phase * Math.PI + index) * (7 + index * 2),
          y: 57 + Math.sin(phase * Math.PI + index) * (7 + index * 2),
        };
        drawSpark(ctx, point, 2 + index * 0.5, index % 2 ? NODE_GLOW : palette.gradientTop);
      }
      return;
    case "zzz":
      for (let index = 0; index < 3; index += 1) {
        const point = {
          x: 83 + index * 9 + Math.sin(phase * TAU + index) * 2,
          y: 25 - index * 10,
        };
        drawNode(ctx, point, 2.2 + index * 0.6, NODE_GLOW, 0.45 + index * 0.15);
      }
      return;
    case "sweat": {
      const point = { x: 30, y: 26 + phase * 11 };
      ctx.save();
      ctx.fillStyle = "#80D4FF";
      ctx.globalAlpha *= 0.75;
      ctx.beginPath();
      ctx.moveTo(point.x, point.y - 4);
      ctx.quadraticCurveTo(point.x - 4, point.y + 1, point.x, point.y + 4);
      ctx.quadraticCurveTo(point.x + 4, point.y + 1, point.x, point.y - 4);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** Draw one animated MAAP mascot pose in the canonical 120x120 art space. */
export function drawMascot(
  pose: MascotPose,
  palette: MascotPalette,
  ctx: CanvasRenderingContext2D,
  size: number,
): void {
  ctx.save();
  ctx.scale(size / ART_SIZE, size / ART_SIZE);

  const stretch = clamp(pose.bodyStretch, 0.86, 1.05);
  const tilt = pose.bodyTilt + pose.antennaDegrees * 0.12;
  ctx.translate(CORE.x, CORE.y);
  ctx.rotate(radians(tilt));
  ctx.scale(1 + (1 - stretch) * 0.25, stretch);
  ctx.translate(-CORE.x, -CORE.y);

  const nodeOpacity = 0.72 + pose.eyeGlowOpacity * 0.28;
  const pulse = 1 + clamp(pose.glowScale - 1, -0.5, 0.6) * 0.12;
  const positions = OUTER_NODES.map((point, index) => {
    const degrees =
      index === 5 ? pose.leftClawDegrees * 0.2 : index === 1 ? pose.rightClawDegrees * 0.2 : 0;
    const rotated = rotate(point, degrees);
    const gazeShift = index % 2 === 0 ? pose.gaze.x * 1.2 : -pose.gaze.x * 0.5;
    const verticalShift =
      index === 0 ? -pose.antennaDroop * 3 : index === 3 ? pose.antennaDroop * 1.5 : 0;
    return { x: rotated.x + gazeShift, y: rotated.y + verticalShift };
  });

  const network = ctx.createLinearGradient(24, 20, 96, 100);
  network.addColorStop(0, palette.gradientTop);
  network.addColorStop(0.5, palette.gradientBottom);
  network.addColorStop(1, NODE_GLOW);

  ctx.save();
  ctx.globalAlpha *= nodeOpacity;
  ctx.strokeStyle = network;
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [fromIndex, toIndex] of EDGES) {
    const from = positions[fromIndex];
    const to = positions[toIndex];
    if (!from || !to) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.globalAlpha *= 0.42;
  ctx.strokeStyle = NODE_INK;
  ctx.lineWidth = 1.15;
  for (const [fromIndex, toIndex] of [
    [0, 3],
    [1, 4],
    [2, 5],
  ] as const) {
    const from = positions[fromIndex];
    const to = positions[toIndex];
    if (!from || !to) {
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }
  ctx.restore();

  for (const [index, point] of positions.entries()) {
    const radius = (4.4 + (index === 0 || index === 3 ? 0.5 : 0)) * pulse;
    drawNode(ctx, point, radius, index % 3 === 0 ? palette.gradientTop : NODE_GLOW, nodeOpacity);
  }

  const coreRadius = 12 * pulse;
  const coreGradient = ctx.createRadialGradient(56, 55, 1, 60, 60, coreRadius + 8);
  coreGradient.addColorStop(0, palette.gradientTop);
  coreGradient.addColorStop(0.72, palette.gradientBottom);
  coreGradient.addColorStop(1, "#0F172A");
  ctx.save();
  ctx.shadowColor = NODE_GLOW;
  ctx.shadowBlur = 8 * pose.eyeGlowOpacity;
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(CORE.x, CORE.y, coreRadius, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = NODE_GLOW;
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  const centerDot = rotate(
    { x: CORE.x + pose.gaze.x * 2.2, y: CORE.y + pose.gaze.y * 1.8 },
    pose.dizzy * 18,
  );
  drawNode(ctx, centerDot, 4.2 + pose.mouthOpen * 1.4, NODE_INK, pose.eyeGlowOpacity);
  if (pose.happyEyes > 0.05) {
    drawSpark(ctx, { x: CORE.x, y: CORE.y }, 6 + pose.happyEyes * 3, NODE_INK);
  }
  if (pose.hardHat > 0.05) {
    ctx.save();
    ctx.strokeStyle = palette.antenna;
    ctx.globalAlpha *= pose.hardHat;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(CORE.x, 25, 6, Math.PI, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawEffects(ctx, pose, palette);
  ctx.restore();
}
