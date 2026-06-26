import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "react-countup";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles, Library, Brain, Trophy, Award, Target, CheckCircle2, Flame as FlameIcon, Zap, Globe, Lock } from "lucide-react";
import SkillModal from "@/components/SkillModal";
import Flame from "@/components/Flame";

const ICON_MAP = { Sparkles, Library, Brain, Trophy, Award, Target, CheckCircle2, Flame: FlameIcon, Zap, Globe };

function StatLedgerItem({ label, value, suffix = "", accent = "gold", testId, divider = true }) {
  const accentClass = accent === "emerald" ? "text-emerald" : accent === "coral" ? "text-coral" : "text-gold-500";
  return (
    <div
      className={`flex-1 px-6 py-5 md:py-6 relative min-w-0 ${divider ? "md:border-r border-b md:border-b-0 border-slate-800" : "border-b md:border-b-0 border-slate-800"}`}
      data-testid={testId}
    >
      <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className={`mt-2 stat-num text-4xl md:text-5xl font-bold ${accentClass}`}>
        <CountUp end={value} duration={1.4} preserveValue />{suffix}
      </div>
    </div>
  );
}

function AchievementChip({ a, justUnlocked }) {
  const Icon = ICON_MAP[a.icon] || Sparkles;
  if (a.unlocked) {
    return (
      <div
        data-testid={`achievement-${a.id}`}
        title={a.desc}
        className={`relative overflow-hidden rounded-xl p-3 text-center border border-gold-500/30 bg-gold-500/8 text-gold-500 ${justUnlocked ? "shine-overlay animate-unlock-pulse" : ""}`}
      >
        <div className="flex justify-center"><Icon className="h-5 w-5" /></div>
        <div className="text-[10px] font-semibold mt-2 leading-tight font-heading">{a.name}</div>
      </div>
    );
  }
  // Locked — deliberately "sealed", not just greyed
  return (
    <div
      data-testid={`achievement-${a.id}`}
      title={a.desc}
      className="relative rounded-xl p-3 text-center border border-slate-800 bg-slate-900/60 text-slate-600"
    >
      <div className="absolute inset-0 rounded-xl pointer-events-none" style={{
        backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 4px, transparent 4px 8px)",
      }} />
      <div className="flex justify-center"><Lock className="h-4 w-4" /></div>
      <div className="text-[10px] font-semibold mt-2 leading-tight font-heading text-slate-500">{a.name}</div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [gami, setGami] = useState(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [justUnlocked, setJustUnlocked] = useState(new Set());
  const seenRef = useRef(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, g] = await Promise.all([api.get("/stats"), api.get("/gamification")]);
      setStats(s.data); setGami(g.data);

      // Detect newly unlocked achievements
      const key = `skillmap_unlocked_${user?.id || "anon"}`;
      const prev = new Set(JSON.parse(localStorage.getItem(key) || "[]"));
      const cur = g.data.achievements.filter((a) => a.unlocked).map((a) => a.id);
      const fresh = cur.filter((id) => !prev.has(id));
      if (fresh.length && seenRef.current !== null) {
        setJustUnlocked(new Set(fresh));
        confetti({ particleCount: 90, spread: 75, origin: { y: 0.4 }, colors: ["#F2B84B", "#FF6B4A", "#2DD4A0"] });
        fresh.forEach((id) => {
          const a = g.data.achievements.find((x) => x.id === id);
          if (a) toast.success(`Unlocked: ${a.name}`, { description: a.desc });
        });
        setTimeout(() => setJustUnlocked(new Set()), 3500);
      }
      seenRef.current = cur;
      localStorage.setItem(key, JSON.stringify(cur));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// dashboard</div>
          <h1 className="font-heading text-4xl md:text-5xl font-bold tracking-tight mt-2 text-slate-50">
            Welcome back, <span className="text-gold-500">{user?.name?.split(" ")[0]}</span>
          </h1>
          <p className="text-slate-400 mt-2">Pick up where you left off. Every entry levels you up.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="dashboard-add-skill">
          <Plus className="h-4 w-4 mr-2" /> Log a skill
        </Button>
      </div>

      {/* Stat ledger strip */}
      <div className="bg-surface rounded-2xl border border-slate-800 overflow-hidden">
        <div className="flex flex-col md:flex-row">
          <StatLedgerItem label="tracked" value={stats?.total || 0} accent="gold" testId="stat-total" />
          <StatLedgerItem label="mastered" value={stats?.mastered || 0} accent="emerald" testId="stat-mastered" />
          <StatLedgerItem label="avg.proficiency" value={Math.round(stats?.avgProficiency || 0)} suffix="%" accent="gold" testId="stat-avg" />
          <StatLedgerItem label="this week" value={stats?.addedThisWeek || 0} accent="gold" testId="stat-week" divider={false} />
        </div>
      </div>

      {/* Streak + Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-coral/30 rounded-2xl p-6 relative overflow-hidden" data-testid="streak-card">
          <div className="absolute -right-4 -top-4 opacity-25 pointer-events-none">
            <Flame streak={gami?.streak || 0} size="lg" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 text-coral">
              <Flame streak={gami?.streak || 0} size="sm" />
              <span className="text-xs font-mono uppercase tracking-[0.25em]">streak</span>
            </div>
            <div className="font-heading text-5xl md:text-6xl font-bold mt-3 stat-num text-coral">
              <CountUp end={gami?.streak || 0} duration={1.2} />
            </div>
            <div className="text-sm text-slate-400 mt-1 font-mono">{(gami?.streak || 0) === 1 ? "day" : "days"} on the chain</div>
            <div className="mt-4 text-xs text-slate-500">
              {(gami?.streak || 0) === 0 ? "Log a skill today to start your streak." : "Don't break it — log a skill before midnight."}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="lg:col-span-2 bg-gradient-to-br from-navy-800 to-navy-900 border border-slate-800 rounded-2xl p-8 relative overflow-hidden" data-testid="goal-progress-card">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-500 font-mono">toward mastery</div>
              <div className="font-heading text-2xl md:text-3xl font-semibold mt-2 text-slate-50">
                You're <span className="stat-num text-gold-500">{stats?.goalPercent ?? 0}%</span> toward your goal
              </div>
            </div>
            <div className="text-sm text-slate-400 max-w-xs">Daily increments compound. The grid never forgets.</div>
          </div>
          <div className="mt-6 h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${stats?.goalPercent || 0}%` }}
              transition={{ duration: 1.4, ease: "easeOut" }}
              className="h-full bg-gold-500 rounded-full shadow-glow-gold"
            />
          </div>
        </motion.div>
      </div>

      {/* Achievements */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface border border-slate-800 rounded-2xl p-6" data-testid="achievements-card">
        <div className="flex items-baseline justify-between mb-4">
          <div>
            <h3 className="font-heading text-xl font-semibold text-slate-50">Unlocks</h3>
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500 mt-1">{gami?.totalUnlocked || 0} / {gami?.totalAchievements || 10} sealed open</div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <AnimatePresence>
            {(gami?.achievements || []).map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04 }}
              >
                <AchievementChip a={a} justUnlocked={justUnlocked.has(a.id)} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Recent activity */}
      <div className="bg-surface border border-slate-800 rounded-2xl p-6">
        <div className="flex items-baseline justify-between">
          <h3 className="font-heading text-xl font-semibold text-slate-50">Recent activity</h3>
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">last 5 events</div>
        </div>
        <div className="mt-5 divide-y divide-slate-800">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-4 h-12 animate-pulse bg-slate-800/40 rounded my-2" />
            ))
          ) : stats?.recentActivity?.length ? (
            stats.recentActivity.map((a, i) => (
              <motion.div key={a.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }} className="py-4 flex items-center justify-between" data-testid={`activity-item-${i}`}>
                <div>
                  <div className="text-sm font-medium text-slate-200">
                    {a.type === "created" ? "Logged" : "Updated"} <span className="text-gold-500">{a.skillName}</span>
                  </div>
                  {a.type === "updated" && a.from !== undefined && (
                    <div className="text-xs text-slate-500 mt-0.5 font-mono">{a.from}% → {a.to}%</div>
                  )}
                </div>
                <div className="text-xs text-slate-500 font-mono">{new Date(a.at).toLocaleDateString()}</div>
              </motion.div>
            ))
          ) : (
            <div className="py-6 text-sm text-slate-500 text-center">No moves logged yet. Add a skill — the grid is waiting.</div>
          )}
        </div>
      </div>

      <SkillModal open={open} onClose={() => setOpen(false)} onSaved={load} />
    </div>
  );
}
