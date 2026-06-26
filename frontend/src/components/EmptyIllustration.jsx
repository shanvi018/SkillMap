import { motion } from "framer-motion";

/**
 * Custom hand-drawn empty-state illustrations in the SkillMap voice.
 * Each variant is a unique abstract scene, not a generic icon-in-circle.
 */
export function ProgressEmptyIllustration() {
  return (
    <svg viewBox="0 0 220 140" className="w-56 h-36 mx-auto" aria-hidden>
      <defs>
        <linearGradient id="pieGold" x1="0" x2="1">
          <stop offset="0" stopColor="#F2B84B" />
          <stop offset="1" stopColor="#FF8A4A" />
        </linearGradient>
      </defs>
      <g stroke="#334155" fill="none" strokeWidth="1">
        {[...Array(7)].map((_, i) => (
          <line key={i} x1="20" y1={20 + i * 18} x2="200" y2={20 + i * 18} />
        ))}
      </g>
      {/* Plotted line that "starts" then stops */}
      <motion.polyline
        points="20,120 50,108 78,98 110,82"
        fill="none"
        stroke="url(#pieGold)"
        strokeWidth="3"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
      />
      {/* Pulsing endpoint marker */}
      <motion.circle
        cx="110" cy="82" r="6"
        fill="#F2B84B"
        animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <text x="118" y="86" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#94A3B8">awaiting next data point...</text>
    </svg>
  );
}

export function GoalsEmptyIllustration() {
  return (
    <svg viewBox="0 0 220 140" className="w-56 h-36 mx-auto" aria-hidden>
      <defs>
        <radialGradient id="targetGold" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#F2B84B" />
          <stop offset="1" stopColor="#A87521" />
        </radialGradient>
      </defs>
      {/* Concentric target */}
      {[50, 38, 26, 14].map((r, i) => (
        <circle
          key={r}
          cx="110" cy="70" r={r}
          fill="none"
          stroke={i === 3 ? "url(#targetGold)" : "#334155"}
          strokeWidth={i === 3 ? "3" : "1.2"}
        />
      ))}
      <circle cx="110" cy="70" r="4" fill="#FF6B4A" />
      {/* Arrow drawn toward target */}
      <motion.g
        initial={{ x: -40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
      >
        <line x1="40" y1="130" x2="100" y2="78" stroke="#F2B84B" strokeWidth="2" strokeLinecap="round" />
        <polygon points="100,78 92,80 96,86" fill="#F2B84B" />
      </motion.g>
      <text x="60" y="20" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#94A3B8">target: undefined</text>
    </svg>
  );
}

export function SkillsEmptyIllustration() {
  return (
    <svg viewBox="0 0 220 140" className="w-56 h-36 mx-auto" aria-hidden>
      <defs>
        <linearGradient id="nodeGold" x1="0" x2="1">
          <stop offset="0" stopColor="#F2B84B" />
          <stop offset="1" stopColor="#2DD4A0" />
        </linearGradient>
      </defs>
      {/* Skill tree nodes */}
      <line x1="110" y1="30" x2="60" y2="80" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="110" y1="30" x2="160" y2="80" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="60" y1="80" x2="60" y2="120" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />
      <line x1="160" y1="80" x2="160" y2="120" stroke="#334155" strokeWidth="1.5" strokeDasharray="3 3" />

      <motion.circle
        cx="110" cy="30" r="11"
        fill="url(#nodeGold)"
        animate={{ scale: [1, 1.15, 1] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
      {[[60, 80], [160, 80], [60, 120], [160, 120]].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="8" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
      ))}
      <text x="20" y="135" fontFamily="JetBrains Mono, monospace" fontSize="9" fill="#94A3B8">no nodes activated.</text>
    </svg>
  );
}
