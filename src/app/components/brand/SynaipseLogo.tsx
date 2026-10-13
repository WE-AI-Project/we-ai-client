// SynAIpse 브랜드 마크 - 시냅스(뉴런 세포체 + 수상돌기)와 그 사이를 건너는 AI 신호(spark).
// 원본은 고정 시드(0x5eed42)로 절차 생성된 SVG이며, 같은 결과를 정적 좌표로 고정해 두었다.
import type { CSSProperties } from "react";

const DENDRITES: ReadonlyArray<{ d: string; w: number }> = [{"d":"M117.9 98.4 Q130.3 98.6 142.7 97.5","w":7.5},{"d":"M142.7 97.5 Q149.4 102.0 157.5 102.9","w":5.4},{"d":"M157.5 102.9 Q161.8 97.9 167.0 93.7","w":3.9},{"d":"M167.0 93.7 Q169.7 90.5 173.0 87.8","w":2.8},{"d":"M157.5 102.9 Q160.4 108.3 164.4 112.8","w":3.9},{"d":"M164.4 112.8 Q167.7 114.8 170.8 117.2","w":2.8},{"d":"M89.0 114.3 Q81.9 124.9 74.2 135.0","w":7.5},{"d":"M74.2 135.0 Q71.7 142.8 66.8 149.5","w":5.4},{"d":"M66.8 149.5 Q66.9 154.8 67.6 160.1","w":3.9},{"d":"M67.6 160.1 Q68.7 164.2 69.0 168.5","w":2.8},{"d":"M66.8 149.5 Q62.3 152.2 58.1 155.3","w":3.9},{"d":"M58.1 155.3 Q57.9 158.6 57.5 161.8","w":2.8},{"d":"M58.1 155.3 Q54.9 155.8 51.7 155.4","w":2.8},{"d":"M85.9 88.8 Q78.1 79.2 68.3 71.4","w":7.5},{"d":"M68.3 71.4 Q63.6 65.4 57.6 60.7","w":5.4},{"d":"M57.6 60.7 Q52.3 60.2 47.2 58.6","w":3.9},{"d":"M47.2 58.6 Q43.0 58.2 38.8 57.5","w":2.8},{"d":"M57.6 60.7 Q57.0 55.0 54.8 49.7","w":3.9},{"d":"M54.8 49.7 Q53.2 45.4 52.3 40.9","w":2.8}];
const TIPS: ReadonlyArray<readonly [number, number, number]> = [[173,87.8,3.9],[170.8,117.2,3.9],[69,168.5,3.9],[57.5,161.8,3.9],[51.7,155.4,3.9],[38.8,57.5,3.9],[52.3,40.9,3.9]];
const MARK_VIEWBOX = "26.9 25.7 158.0 158.0";

export const BRAND = {
  synapse: "#2f6bff",
  signal: "#00d6a3",
  synapseOnDark: "#5b8cff",
  signalOnDark: "#1fe7b6",
  deep: "#0a0e17",
  paper: "#f5f6f8",
} as const;

type MarkVariant = "light" | "dark";

/** 로고 마크. variant="dark"는 어두운 배경용 색, gapColor는 신호 원 테두리(배경색과 맞춘다). */
export function SynaipseMark({
  size = 24,
  variant = "dark",
  gapColor,
  pulse = false,
  className,
  style,
  title = "SynAIpse",
}: {
  size?: number;
  variant?: MarkVariant;
  gapColor?: string;
  pulse?: boolean;
  className?: string;
  style?: CSSProperties;
  title?: string;
}) {
  const synapse = variant === "dark" ? BRAND.synapseOnDark : BRAND.synapse;
  const signal = variant === "dark" ? BRAND.signalOnDark : BRAND.signal;
  const gap = gapColor ?? (variant === "dark" ? BRAND.deep : BRAND.paper);
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: "block", flexShrink: 0, ...style }}
    >
      <g fill="none" stroke={synapse} strokeLinecap="round" strokeLinejoin="round">
        {DENDRITES.map((p, i) => <path key={i} d={p.d} strokeWidth={p.w} />)}
      </g>
      <g fill={synapse}>
        {TIPS.map(([cx, cy, r], i) => <circle key={i} cx={cx} cy={cy} r={r} />)}
      </g>
      <circle cx={100} cy={100} r={18} fill={signal} style={pulse ? { animation: "_synaipse-spark 2.6s ease-in-out infinite" } : undefined} />
      <circle cx={100} cy={100} r={18} fill="none" stroke={gap} strokeWidth={4} />
      {pulse && <style>{"@keyframes _synaipse-spark { 0%, 100% { opacity: .45; } 45% { opacity: 1; } }"}</style>}
    </svg>
  );
}

/** 앱 아이콘 형태(어두운 라운드 사각형 위의 마크). */
export function SynaipseAppIcon({ size = 24, pulse = false, style }: { size?: number; pulse?: boolean; style?: CSSProperties }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.24),
        background: BRAND.deep,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <SynaipseMark size={Math.round(size * 0.76)} variant="dark" pulse={pulse} />
    </span>
  );
}

/** 워드마크: Syn<AI>pse - AI 부분만 신호색. */
export function SynaipseWordmark({ onDark = false, className, style }: { onDark?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={{ letterSpacing: "-0.02em", ...style }}>
      Syn<span style={{ color: onDark ? BRAND.signalOnDark : BRAND.signal, fontWeight: 700 }}>AI</span>pse
    </span>
  );
}
