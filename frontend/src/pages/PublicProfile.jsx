import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API } from "@/lib/api";
import ProgressRing from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Flame from "@/components/Flame";
import { Sparkles, Award, TrendingUp, ExternalLink } from "lucide-react";

export default function PublicProfile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/public/profile/${username}`);
        setData(res.data);
      } catch (e) {
        setError(e.response?.status === 404 ? "Profile not found" : "Couldn't load this profile");
      } finally { setLoading(false); }
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center">
        <div className="h-10 w-10 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-ink flex flex-col items-center justify-center px-6 text-center">
        <div className="font-heading stat-num text-7xl font-bold text-gold-500">404</div>
        <h2 className="font-heading text-2xl font-semibold mt-3 text-slate-50">{error}</h2>
        <p className="text-slate-400 mt-2 text-sm font-mono">// no record at <span className="text-slate-200">@{username}</span></p>
        <Button asChild className="mt-6 bg-gold-500 hover:bg-gold-600 text-ink font-semibold">
          <Link to="/login">Open SkillMap</Link>
        </Button>
      </div>
    );
  }

  const { user, stats, skills } = data;
  const grouped = skills.reduce((acc, s) => { (acc[s.category] = acc[s.category] || []).push(s); return acc; }, {});
  const sortedCats = Object.keys(grouped).sort();

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      {/* Decorative grid */}
      <div className="relative">
        <svg className="absolute inset-0 w-full h-64 opacity-[0.06] pointer-events-none" aria-hidden>
          <defs>
            <pattern id="pubGrid" width="36" height="36" patternUnits="userSpaceOnUse">
              <path d="M 36 0 L 0 0 0 36" fill="none" stroke="#F2B84B" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#pubGrid)" />
        </svg>
        <header className="relative max-w-5xl mx-auto px-6 md:px-10 pt-8 pb-2 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gold-500 flex items-center justify-center font-heading font-bold text-ink shadow-glow-gold">S</div>
            <span className="font-heading font-semibold text-slate-100">SkillMap</span>
          </Link>
          <Button asChild variant="outline" size="sm" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
            <Link to="/login">
              Build your own <ExternalLink className="h-3 w-3 ml-1" />
            </Link>
          </Button>
        </header>
      </div>

      <main className="max-w-5xl mx-auto px-6 md:px-10 py-8 md:py-12 space-y-10">
        {/* Hero */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} data-testid="public-profile-hero">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {user.avatar ? (
              <img
                src={user.avatar.startsWith("/api/") ? `${API.replace(/\/api$/, "")}${user.avatar}` : user.avatar}
                alt={user.name}
                className="h-24 w-24 rounded-2xl object-cover ring-2 ring-gold-500/40 shadow-glow-gold"
                data-testid="public-avatar"
              />
            ) : (
              <div className="h-24 w-24 rounded-2xl bg-gold-500 text-ink flex items-center justify-center text-4xl font-heading font-bold shadow-glow-gold">
                {user.name?.[0]?.toUpperCase() || "U"}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-gold-500">// public profile</div>
              <h1 className="font-heading text-4xl md:text-5xl font-bold mt-1 text-slate-50">{user.name}</h1>
              <div className="text-sm text-slate-400 font-mono mt-1" data-testid="public-handle">@{user.username}</div>
              {(user.course || user.branch || user.year) && (
                <div className="text-sm text-slate-300 mt-2">
                  {[user.course, user.branch, user.year].filter(Boolean).join(" · ")}
                </div>
              )}
              {user.bio && <p className="text-sm text-slate-400 mt-3 max-w-2xl">{user.bio}</p>}
            </div>
          </div>
        </motion.section>

        {/* Stats ledger */}
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface rounded-2xl border border-slate-800 overflow-hidden" data-testid="public-stats">
          <div className="flex flex-col md:flex-row">
            <div className="flex-1 px-6 py-5 md:py-6 md:border-r border-b md:border-b-0 border-slate-800 flex items-center gap-4">
              <Sparkles className="h-5 w-5 text-gold-500" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">tracked</div>
                <div className="stat-num text-3xl font-bold text-gold-500 mt-1">{stats.total}</div>
              </div>
            </div>
            <div className="flex-1 px-6 py-5 md:py-6 md:border-r border-b md:border-b-0 border-slate-800 flex items-center gap-4">
              <Award className="h-5 w-5 text-emerald" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">mastered</div>
                <div className="stat-num text-3xl font-bold text-emerald mt-1">{stats.mastered}</div>
              </div>
            </div>
            <div className="flex-1 px-6 py-5 md:py-6 md:border-r border-b md:border-b-0 border-slate-800 flex items-center gap-4">
              <TrendingUp className="h-5 w-5 text-gold-500" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">avg.proficiency</div>
                <div className="stat-num text-3xl font-bold text-gold-500 mt-1">{Math.round(stats.avgProficiency)}%</div>
              </div>
            </div>
            <div className="flex-1 px-6 py-5 md:py-6 flex items-center gap-4">
              <Flame streak={stats.streak} size="sm" />
              <div>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">streak</div>
                <div className="stat-num text-3xl font-bold text-coral mt-1">{stats.streak}</div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Skills grouped by category */}
        {skills.length === 0 ? (
          <div className="bg-surface border border-slate-800 rounded-2xl p-10 text-center" data-testid="public-empty">
            <h3 className="font-heading text-xl font-semibold text-slate-50">No skills logged yet</h3>
            <p className="text-sm text-slate-400 mt-2">This profile is just getting started.</p>
          </div>
        ) : (
          sortedCats.map((cat) => (
            <motion.section
              key={cat}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              data-testid={`public-cat-${cat.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-heading text-2xl font-semibold text-slate-50">{cat}</h2>
                <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">{grouped[cat].length} skill{grouped[cat].length !== 1 ? "s" : ""}</div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {grouped[cat].map((s, i) => (
                  <motion.div
                    key={`${cat}-${i}`}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="bg-surface border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <h3 className="font-heading font-semibold text-slate-50 truncate">{s.name}</h3>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className={`font-mono text-[10px] ${s.level === "Expert" ? "border-emerald/40 text-emerald bg-emerald/10" : s.level === "Advanced" ? "border-gold-500/40 text-gold-500 bg-gold-500/10" : "border-slate-700 text-slate-300 bg-slate-800"}`}>{s.level}</Badge>
                      </div>
                    </div>
                    <ProgressRing value={s.proficiency} size={68} stroke={6} color={s.level === "Expert" ? "#2DD4A0" : "#F2B84B"} />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))
        )}

        <footer className="text-center pt-6 pb-2">
          <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">
            // powered by <Link to="/login" className="text-gold-500 hover:underline">SkillMap</Link> — track your skills, share your map.
          </p>
        </footer>
      </main>
    </div>
  );
}
