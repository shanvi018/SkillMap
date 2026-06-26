import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, CartesianGrid,
} from "recharts";
import { ActivityCalendar } from "react-activity-calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import EmptyState from "@/components/EmptyState";
import { ProgressEmptyIllustration } from "@/components/EmptyIllustration";

const CATEGORIES = ["Frontend", "Backend", "DevOps", "Design", "Data Science", "Mobile", "Other"];

function buildHeatmap(events) {
  const today = new Date();
  const start = new Date(today); start.setDate(today.getDate() - 364);
  const map = {};
  for (const e of events) map[e.date] = e.count;
  const data = [];
  const d = new Date(start);
  while (d <= today) {
    const key = d.toISOString().slice(0, 10);
    const count = map[key] || 0;
    const level = count === 0 ? 0 : count < 2 ? 1 : count < 4 ? 2 : count < 6 ? 3 : 4;
    data.push({ date: key, count, level });
    d.setDate(d.getDate() + 1);
  }
  return data;
}

export default function ProgressPage() {
  const [skills, setSkills] = useState([]);
  const [heatmap, setHeatmap] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedSkill, setSelectedSkill] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: s }, { data: h }] = await Promise.all([api.get("/skills"), api.get("/heatmap")]);
        setSkills(s);
        setHeatmap(buildHeatmap(h));
        if (s.length) setSelectedSkill(s[0].id);
      } finally { setLoaded(true); }
    })();
  }, []);

  useEffect(() => {
    if (!selectedSkill) return;
    (async () => {
      const { data } = await api.get(`/skills/${selectedSkill}/history`);
      setHistory(data.map((d) => ({ date: d.recordedAt.slice(5, 10), proficiency: d.proficiency })));
    })();
  }, [selectedSkill]);

  const topSkills = useMemo(() =>
    [...skills].sort((a, b) => b.proficiency - a.proficiency).slice(0, 8).map((s) => ({ name: s.name, value: s.proficiency })),
    [skills]
  );

  const radarData = useMemo(() =>
    CATEGORIES.map((c) => {
      const inCat = skills.filter((s) => s.category === c);
      const avg = inCat.length ? Math.round(inCat.reduce((a, s) => a + s.proficiency, 0) / inCat.length) : 0;
      return { category: c, value: avg };
    }),
    [skills]
  );

  const weeklyImproved = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return skills.filter((s) => new Date(s.updatedAt) >= cutoff).length;
  }, [skills]);

  // No skills yet → friendly empty hero before any charts try to render
  if (loaded && skills.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// insights</div>
          <h1 className="font-heading text-4xl font-bold mt-2 text-slate-50">Progress</h1>
        </div>
        <EmptyState
          illustration={<ProgressEmptyIllustration />}
          title="The grid is waiting for its first signal"
          description="Charts, heatmaps, and growth curves materialize the moment you log your first skill update. Plot one point — the rest follows."
          testId="progress-empty"
        />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// insights</div>
        <h1 className="font-heading text-4xl font-bold mt-2 text-slate-50">Progress</h1>
        <p className="text-slate-400 mt-1 text-sm">Visualize your growth across categories and over time.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-surface border border-slate-800 rounded-2xl p-6" data-testid="weekly-summary">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">this week</div>
          <div className="font-heading text-3xl font-bold mt-2 stat-num text-gold-500">{weeklyImproved}</div>
          <div className="text-sm text-slate-400 mt-1">skills improved</div>
        </div>
        <div className="bg-surface border border-slate-800 rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">total tracked</div>
          <div className="font-heading text-3xl font-bold mt-2 stat-num text-slate-50">{skills.length}</div>
          <div className="text-sm text-slate-400 mt-1">across {new Set(skills.map((s) => s.category)).size} categories</div>
        </div>
        <div className="bg-gradient-to-br from-gold-600 to-gold-500 text-ink rounded-2xl p-6">
          <div className="text-[10px] uppercase tracking-[0.25em] text-ink/70 font-mono">average</div>
          <div className="font-heading text-3xl font-bold mt-2 stat-num">
            {skills.length ? Math.round(skills.reduce((a, s) => a + s.proficiency, 0) / skills.length) : 0}%
          </div>
          <div className="text-sm text-ink/70 mt-1">overall proficiency</div>
        </div>
      </div>

      {/* Bar chart */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-slate-800 rounded-2xl p-6">
        <h3 className="font-heading text-xl font-semibold mb-1 text-slate-50">Top 8 Skills</h3>
        <p className="text-[10px] text-slate-500 mb-4 font-mono uppercase tracking-[0.25em]">sorted by proficiency</p>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={topSkills} layout="vertical" margin={{ left: 20, right: 20 }}>
              <CartesianGrid stroke="#1E293B" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12, fill: "#94A3B8", fontFamily: "JetBrains Mono" }} />
              <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12, fill: "#94A3B8" }} />
              <Tooltip contentStyle={{ background: "#0B1120", border: "1px solid #1E293B", color: "white", borderRadius: 8 }} />
              <Bar dataKey="value" fill="#F2B84B" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-slate-800 rounded-2xl p-6">
          <h3 className="font-heading text-xl font-semibold mb-1 text-slate-50">Category Coverage</h3>
          <p className="text-[10px] text-slate-500 mb-4 font-mono uppercase tracking-[0.25em]">avg proficiency per category</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1E293B" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 11, fill: "#94A3B8" }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "#64748B", fontFamily: "JetBrains Mono" }} />
                <Radar dataKey="value" stroke="#F2B84B" fill="#F2B84B" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background: "#0B1120", border: "1px solid #1E293B", color: "white", borderRadius: 8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-slate-800 rounded-2xl p-6">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="font-heading text-xl font-semibold text-slate-50">Growth Over Time</h3>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-[0.25em]">proficiency history per skill</p>
            </div>
            {skills.length > 0 && (
              <Select value={selectedSkill} onValueChange={setSelectedSkill}>
                <SelectTrigger className="w-40 h-8 text-xs bg-slate-900 border-slate-800" data-testid="growth-skill-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid stroke="#1E293B" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "JetBrains Mono" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#94A3B8", fontFamily: "JetBrains Mono" }} />
                <Tooltip contentStyle={{ background: "#0B1120", border: "1px solid #1E293B", color: "white", borderRadius: 8 }} />
                <Line type="monotone" dataKey="proficiency" stroke="#F2B84B" strokeWidth={2.5} dot={{ fill: "#F2B84B", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-slate-800 rounded-2xl p-6 overflow-x-auto" data-testid="heatmap-card">
        <h3 className="font-heading text-xl font-semibold mb-1 text-slate-50">Activity Heatmap</h3>
        <p className="text-[10px] text-slate-500 mb-4 font-mono uppercase tracking-[0.25em]">last 365 days of skill updates</p>
        {heatmap.length === 0 ? (
          <div className="py-10 text-center" data-testid="heatmap-empty">
            <div className="text-sm text-slate-400 max-w-sm mx-auto">
              Your heatmap is warming up. Log a skill update and watch the grid light up day by day.
            </div>
          </div>
        ) : (
          <ActivityCalendar
            data={heatmap}
            colorScheme="dark"
            blockSize={12}
            blockMargin={3}
            fontSize={11}
            theme={{ dark: ["#1f2937", "#3a2f12", "#7a5b1f", "#c08a2a", "#F2B84B"] }}
          />
        )}
      </motion.div>
    </div>
  );
}
