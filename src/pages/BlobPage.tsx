import { useEffect, useRef } from 'react';

import styles from './BlobPage.module.css';

const WIDTH = 480;
const HEIGHT = 360;
const LOOP_DURATION = 3_600;
const TAU = Math.PI * 2;

const VERTEX_SHADER = `
  attribute vec2 aPosition;
  varying vec2 vUv;

  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 vUv;
  uniform float uTheta;
  uniform float uMotion;
  uniform float uActive;

  const float ASPECT = 1.3333333;

  mat2 rotate2d(float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, -s, s, c);
  }

  float field(
    vec2 point,
    vec2 center,
    vec2 radius,
    float angle,
    float phase,
    float deformation,
    float strength
  ) {
    vec2 local = rotate2d(-angle) * (point - center);
    vec2 normalized = local / radius;

    // The front and tail of each field travel at slightly different speeds.
    float activeDeformation = deformation * uMotion;
    normalized.x += sin(normalized.y * 3.1 + uTheta * 2.0 + phase) * activeDeformation;
    normalized.y += sin(normalized.x * 2.4 - uTheta * 3.0 + phase * 1.7)
      * activeDeformation * 0.58;
    normalized.x += sin((normalized.x + normalized.y) * 4.3 - uTheta + phase)
      * activeDeformation * 0.24;

    float distanceField = dot(normalized, normalized);
    float body = exp(-distanceField * 1.85);
    float trailingLobe = exp(-dot(
      normalized - vec2(-0.54, sin(uTheta * 2.0 + phase) * 0.16),
      normalized - vec2(-0.54, sin(uTheta * 2.0 + phase) * 0.16)
    ) * 3.4) * 0.26;

    return (body + trailingLobe) * strength;
  }

  void main() {
    vec2 point = vec2((vUv.x - 0.5) * ASPECT, vUv.y - 0.5);
    float t = uTheta;

    // A shared curl-like field bends the material instead of merely translating it.
    vec2 flow = vec2(
      sin(point.y * 12.0 + t * 2.0) + 0.55 * sin((point.x + point.y) * 17.0 - t * 3.0),
      cos(point.x * 11.0 - t * 2.0) + 0.50 * cos((point.x - point.y) * 15.0 + t)
    );
    vec2 counterFlow = vec2(
      cos(point.y * 8.0 - t) - sin(point.x * 14.0 + t * 2.0) * 0.45,
      sin(point.x * 9.0 + t) + cos(point.y * 13.0 - t * 3.0) * 0.42
    );
    vec2 warpedPoint = point + flow * 0.014 * uMotion + counterFlow * 0.009 * uMotion;

    vec2 center0 = vec2(
      cos(t - 0.50) * 0.038 + sin(t * 2.0 + 0.20) * 0.018,
      sin(t - 0.50) * 0.033 + cos(t * 3.0 - 0.10) * 0.012
    );
    vec2 center1 = vec2(
      cos(t - 0.86) * 0.135 + sin(t * 3.0 + 0.70) * 0.026,
      sin(t - 0.86) * 0.125 + cos(t * 2.0 - 0.30) * 0.030
    );
    vec2 center2 = vec2(
      cos(t + 3.02) * 0.170 + sin(t * 2.0 + 1.40) * 0.030,
      sin(t + 3.02) * 0.155 + cos(t * 3.0 + 0.50) * 0.025
    );
    vec2 center3 = vec2(
      cos(t + 2.42) * 0.192 + sin(t * 3.0 - 0.90) * 0.032,
      sin(t + 2.42) * 0.170 + cos(t * 2.0 + 1.10) * 0.036
    );
    vec2 center4 = vec2(
      cos(t + 2.31) * 0.225 + sin(t * 2.0 + 0.20) * 0.040,
      sin(t + 2.31) * 0.215 + cos(t * 3.0 - 0.60) * 0.035
    );
    float orbitScale = mix(0.68, 1.0, uMotion);
    center0 *= orbitScale;
    center1 *= orbitScale;
    center2 *= orbitScale;
    center3 *= orbitScale;
    center4 *= orbitScale;

    float density0 = field(
      warpedPoint + counterFlow * 0.006,
      center0,
      vec2(0.245, 0.220) * 1.08 * vec2(1.0 + sin(t * 2.0 - 0.5) * 0.12, 1.0 + cos(t * 3.0) * 0.11),
      sin(t * 2.0) * 0.18,
      -0.5,
      0.105,
      0.54
    );
    float density1 = field(
      warpedPoint + flow * 0.008,
      center1,
      vec2(0.195, 0.170) * 1.08 * vec2(1.0 + sin(t * 2.0 - 0.86) * 0.18, 1.0 + cos(t * 3.0 - 0.2) * 0.15),
      0.30 + sin(t * 2.0 + 0.4) * 0.32,
      -0.86,
      0.145,
      1.06
    );
    float density2 = field(
      warpedPoint - counterFlow * 0.007,
      center2,
      vec2(0.170, 0.158) * 1.08 * vec2(1.0 + sin(t * 3.0 + 0.6) * 0.20, 1.0 + cos(t * 2.0 + 1.1) * 0.17),
      -0.25 + sin(t * 3.0) * 0.38,
      3.02,
      0.155,
      0.96
    );
    float density3 = field(
      warpedPoint + vec2(flow.y, -flow.x) * 0.008,
      center3,
      vec2(0.145, 0.158) * 1.08 * vec2(1.0 + sin(t * 2.0 + 2.0) * 0.21, 1.0 + cos(t * 3.0 - 0.5) * 0.19),
      0.52 + sin(t * 2.0 + 0.8) * 0.42,
      2.42,
      0.175,
      0.98
    );
    float density4 = field(
      warpedPoint - flow * 0.010,
      center4,
      vec2(0.108, 0.135) * 1.08 * vec2(1.0 + sin(t * 3.0 + 0.3) * 0.26, 1.0 + cos(t * 2.0 - 0.7) * 0.23),
      -0.65 + sin(t * 3.0 - 0.3) * 0.48,
      2.31,
      0.205,
      1.22
    );

    float positiveDensity = density0 + density1 + density2 + density3 + density4;

    // Several soft, deforming low-density pockets replace the circular eraser.
    vec2 voidCenter0 = vec2(
      cos(t + 1.28) * 0.128 + sin(t * 2.0) * 0.026,
      sin(t + 1.28) * 0.132 + cos(t * 3.0 + 0.8) * 0.022
    );
    vec2 voidCenter1 = vec2(
      cos(t - 1.05) * 0.175 + sin(t * 3.0 + 0.4) * 0.025,
      sin(t - 1.05) * 0.150 + cos(t * 2.0 - 0.2) * 0.030
    );
    voidCenter0 *= orbitScale;
    voidCenter1 *= orbitScale;
    float void0 = field(
      warpedPoint - counterFlow * 0.012,
      voidCenter0,
      vec2(0.120, 0.096) * vec2(1.0 + sin(t * 2.0) * 0.25, 1.0 + cos(t * 3.0) * 0.22),
      sin(t * 2.0 + 0.5) * 0.55,
      1.28,
      0.22,
      1.30
    );
    float void1 = field(
      warpedPoint + flow * 0.009,
      voidCenter1,
      vec2(0.084, 0.128) * vec2(1.0 + sin(t * 3.0 + 0.5) * 0.27, 1.0 + cos(t * 2.0) * 0.24),
      0.8 + cos(t * 2.0) * 0.6,
      -1.05,
      0.24,
      0.62
    );

    float finalDensity = positiveDensity - void0 - void1;
    float smokeAlpha = smoothstep(-0.012, 0.38, finalDensity) * 0.34;
    float bodyAlpha = smoothstep(0.10, 0.76, finalDensity) * 0.64;
    float materialAlpha = min(0.96, smokeAlpha + bodyAlpha);

    float distanceFromCenter = length(point);
    float sphereMask = 1.0 - smoothstep(0.265, 0.294, distanceFromCenter);
    float alpha = materialAlpha * sphereMask * 0.94;

    vec3 violetColor = mix(vec3(0.22, 0.53, 0.88), vec3(0.42, 0.18, 0.90), uActive);
    vec3 magentaColor = mix(vec3(0.12, 0.40, 0.78), vec3(0.95, 0.07, 0.84), uActive);
    vec3 color = (
      density0 * vec3(0.67, 0.98, 0.97)
      + density1 * vec3(0.09, 0.86, 0.94)
      + density2 * vec3(0.25, 0.48, 0.97)
      + density3 * violetColor
      + density4 * magentaColor
    ) / max(positiveDensity, 0.0001);

    // Thin material becomes milky; compressed overlaps become deeper and richer.
    float materialWeight = smoothstep(0.06, 0.95, positiveDensity);
    color = mix(vec3(0.90, 0.98, 1.0), color, 0.30 + materialWeight * 0.70);
    float compression = smoothstep(0.82, 2.0, positiveDensity);
    color *= 1.0 - compression * vec3(0.17, 0.11, 0.06);

    gl_FragColor = vec4(color, alpha);
  }
`;

function compileShader(
  context: WebGLRenderingContext,
  type: number,
  source: string,
) {
  const shader = context.createShader(type);
  if (!shader) return null;

  context.shaderSource(shader, source);
  context.compileShader(shader);

  if (!context.getShaderParameter(shader, context.COMPILE_STATUS)) {
    context.deleteShader(shader);
    return null;
  }

  return shader;
}

type BlobOrbProps = {
  active?: boolean;
  motion?: number;
  speed?: number;
  label?: string;
};

export function BlobOrb({
  active = true,
  motion = 1,
  speed = 1,
  label = '서로 흐르고 합쳐지며 상쇄되는 컬러 유체 블롭',
}: BlobOrbProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    });
    if (!canvas || !context) return;

    const vertexShader = compileShader(context, context.VERTEX_SHADER, VERTEX_SHADER);
    const fragmentShader = compileShader(context, context.FRAGMENT_SHADER, FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) return;

    const program = context.createProgram();
    const positionBuffer = context.createBuffer();
    if (!program || !positionBuffer) return;

    context.attachShader(program, vertexShader);
    context.attachShader(program, fragmentShader);
    context.linkProgram(program);
    if (!context.getProgramParameter(program, context.LINK_STATUS)) return;

    context.useProgram(program);
    context.bindBuffer(context.ARRAY_BUFFER, positionBuffer);
    context.bufferData(
      context.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      context.STATIC_DRAW,
    );

    const positionLocation = context.getAttribLocation(program, 'aPosition');
    const thetaLocation = context.getUniformLocation(program, 'uTheta');
    const motionLocation = context.getUniformLocation(program, 'uMotion');
    const activeLocation = context.getUniformLocation(program, 'uActive');
    context.enableVertexAttribArray(positionLocation);
    context.vertexAttribPointer(positionLocation, 2, context.FLOAT, false, 0, 0);
    context.viewport(0, 0, WIDTH, HEIGHT);
    context.clearColor(0, 0, 0, 0);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let animationFrame = 0;
    let startedAt: number | null = null;

    const draw = (theta: number) => {
      context.clear(context.COLOR_BUFFER_BIT);
      context.uniform1f(thetaLocation, theta);
      context.uniform1f(motionLocation, motion);
      context.uniform1f(activeLocation, active ? 1 : 0);
      context.drawArrays(context.TRIANGLES, 0, 3);
    };

    if (reduceMotion) {
      draw(0);
    } else {
      const render = (timestamp: number) => {
        if (startedAt === null) startedAt = timestamp;
        const adjustedLoopDuration = LOOP_DURATION / speed;
        const elapsed = (timestamp - startedAt) % adjustedLoopDuration;
        draw((elapsed / adjustedLoopDuration) * TAU);
        animationFrame = window.requestAnimationFrame(render);
      };

      animationFrame = window.requestAnimationFrame(render);
    }

    return () => {
      window.cancelAnimationFrame(animationFrame);
      context.deleteBuffer(positionBuffer);
      context.deleteProgram(program);
      context.deleteShader(vertexShader);
      context.deleteShader(fragmentShader);
    };
  }, [active, motion, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={styles.canvas}
      width={WIDTH}
      height={HEIGHT}
      aria-label={label}
      role="img"
    />
  );
}

export function BlobPage() {
  return (
    <main className={styles.page}>
      <div className={styles.orbRow}>
        <div className={styles.orbSlot}>
          <BlobOrb label="빠르고 역동적으로 흐르는 컬러 유체 블롭" />
        </div>
        <div className={styles.orbSlot}>
          <BlobOrb
            active={false}
            motion={0.48}
            speed={0.42}
            label="잔잔하고 느리게 흐르는 컬러 유체 블롭"
          />
        </div>
      </div>
    </main>
  );
}
