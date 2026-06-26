import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Distinct progress ring with tick marks every 10% and a glow on the active arc.
 * Animates the fill when it first scrolls into view (IntersectionObserver).
 */
export default function ProgressRing({ value = 0, size = 84, stroke = 8, color = "#F2B84B", label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    if (prefersReduced) { setVisible(true); return; }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [prefersReduced]);

  // Tick marks every 10 degrees of progress (10 ticks for 0–100%)
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10); // every 10 deg = 36 ticks
  const tickInner = r - stroke / 2 - 1;
  const tickOuter = r + stroke / 2 + 2;

  return (
    <div
      ref={ref}
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
      data-testid="progress-ring"
    >
      <svg width={size} height={size} className="-rotate-90 overflow-visible">
        <defs>
          <filter id={`glow-${color.replace("#", "")}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* Tick marks */}
        {ticks.map((deg, i) => {
          const rad = (deg * Math.PI) / 180;
          const cx = size / 2 + tickInner * Math.cos(rad);
          const cy = size / 2 + tickInner * Math.sin(rad);
          const ex = size / 2 + tickOuter * Math.cos(rad);
          const ey = size / 2 + tickOuter * Math.sin(rad);
          const major = i % 3 === 0;
          return (
            <line
              key={deg}
              x1={cx} y1={cy} x2={ex} y2={ey}
              stroke={major ? "#475569" : "#334155"}
              strokeWidth={major ? 1.5 : 1}
              strokeLinecap="round"
            />
          );
        })}
        {/* Background track */}
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1E293B" strokeWidth={stroke} fill="none" />
        {/* Active arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: visible ? offset : c }}
          transition={{ duration: prefersReduced ? 0 : 1.3, ease: "easeOut" }}
          style={{ filter: `url(#glow-${color.replace("#", "")})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="stat-num text-lg font-semibold text-slate-100">{Math.round(value)}<span className="text-xs text-slate-400 ml-0.5">%</span></div>
        {label && <div className="text-[9px] uppercase tracking-widest text-slate-500 mt-0.5">{label}</div>}
      </div>
    </div>
  );
}
