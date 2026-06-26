import { motion } from "framer-motion";

/**
 * Animated coral/gold flame icon. Scales with streak count; flickers continuously.
 * Respects prefers-reduced-motion via the global CSS rule.
 */
export default function Flame({ streak = 0, size = "md" }) {
  // Scale grows with streak: 1 at streak=0, up to ~1.6 at streak>=14
  const scale = 1 + Math.min(streak, 14) / 24;
  const dim = size === "lg" ? 72 : size === "md" ? 56 : 40;

  return (
    <motion.div
      animate={{ scale }}
      transition={{ type: "spring", stiffness: 120, damping: 12 }}
      style={{ width: dim, height: dim }}
      className="relative flex items-center justify-center"
      data-testid="flame-icon"
    >
      <svg
        viewBox="0 0 64 64"
        width={dim}
        height={dim}
        className="animate-flicker"
        aria-hidden
      >
        <defs>
          <radialGradient id="flameInner" cx="50%" cy="65%" r="55%">
            <stop offset="0%" stopColor="#FFF3C2" stopOpacity="1" />
            <stop offset="45%" stopColor="#F2B84B" stopOpacity="1" />
            <stop offset="100%" stopColor="#FF6B4A" stopOpacity="0.9" />
          </radialGradient>
          <radialGradient id="flameCore" cx="50%" cy="70%" r="30%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#F2B84B" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* Outer flame */}
        <path
          d="M32 4 C 36 14, 50 20, 48 36 C 47 50, 38 58, 32 60 C 26 58, 17 50, 16 36 C 14 22, 28 18, 32 4 Z"
          fill="url(#flameInner)"
        />
        {/* Inner flame */}
        <path
          d="M32 18 C 34 24, 42 28, 40 40 C 39 48, 35 53, 32 55 C 29 53, 25 48, 24 40 C 22 30, 30 26, 32 18 Z"
          fill="#FF8A4A"
          opacity="0.85"
        />
        {/* Core */}
        <ellipse cx="32" cy="44" rx="6" ry="10" fill="url(#flameCore)" />
      </svg>
    </motion.div>
  );
}
