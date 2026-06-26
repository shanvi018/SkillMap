import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { api, formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle2 } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import { GoalsEmptyIllustration } from "@/components/EmptyIllustration";
import { toast } from "sonner";

const LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];
const LEVEL_PROF = { Beginner: 25, Intermediate: 50, Advanced: 75, Expert: 95 };

function statusStyle(s) {
  if (s === "Completed") return "border-emerald/40 text-emerald bg-emerald/10";
  if (s === "Overdue") return "border-coral/40 text-coral bg-coral/10";
  if (s === "At Risk") return "border-coral/30 text-coral/90 bg-coral/5";
  return "border-gold-500/40 text-gold-500 bg-gold-500/10";
}

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [skills, setSkills] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ skillId: "", targetLevel: "Advanced", deadline: "", title: "" });
  const [errors, setErrors] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: g }, { data: s }] = await Promise.all([api.get("/goals"), api.get("/skills")]);
      setGoals(g); setSkills(s);
      if (s.length && !form.skillId) setForm((f) => ({ ...f, skillId: s[0].id }));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const submit = async () => {
    const errs = {};
    if (!form.skillId) errs.skillId = "Pick a skill";
    if (!form.deadline) errs.deadline = "Pick a deadline";
    else if (new Date(form.deadline) < new Date(new Date().toDateString())) errs.deadline = "Deadline must be in the future";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    try {
      await api.post("/goals", {
        skillId: form.skillId,
        targetLevel: form.targetLevel,
        targetProficiency: LEVEL_PROF[form.targetLevel],
        deadline: new Date(form.deadline).toISOString(),
        title: form.title,
      });
      toast.success("Goal locked in");
      setOpen(false);
      setErrors({});
      setForm({ skillId: skills[0]?.id || "", targetLevel: "Advanced", deadline: "", title: "" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const removeGoal = async (id) => {
    try { await api.delete(`/goals/${id}`); toast.success("Goal removed"); load(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const complete = async (g) => {
    try {
      await api.put(`/goals/${g.id}`, { completed: true });
      confetti({ particleCount: 160, spread: 80, origin: { y: 0.6 }, colors: ["#F2B84B", "#FF6B4A", "#2DD4A0"] });
      toast.success(`${g.skillName} → ${g.targetLevel} 🏁`, { description: "Goal completed!" });
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// targets</div>
          <h1 className="font-heading text-4xl font-bold mt-2 text-slate-50">Learning Goals</h1>
          <p className="text-slate-400 mt-1 text-sm">Pick a target. Set a deadline. Cross the line.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" disabled={!skills.length} data-testid="add-goal-button">
          <Plus className="h-4 w-4 mr-2" /> New goal
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-44 rounded-2xl bg-slate-800/40 animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          illustration={<GoalsEmptyIllustration />}
          title="No goals set — yet"
          description={skills.length
            ? "A goal is a deadline with intention. Pick a skill, draw a line, hit the mark."
            : "First, add a skill or two. Then come back and aim somewhere."}
          action={skills.length
            ? <Button onClick={() => setOpen(true)} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="empty-add-goal">
                <Plus className="h-4 w-4 mr-2" />Aim at something
              </Button>
            : null}
          testId="goals-empty"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <AnimatePresence>
            {goals.map((g, i) => {
              const pct = Math.min(100, Math.round((g.currentProficiency / g.targetProficiency) * 100));
              return (
                <motion.div
                  key={g.id}
                  initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }}
                  transition={{ delay: i * 0.06 }}
                  whileHover={{ y: -3 }}
                  data-testid={`goal-card-${g.id}`}
                  className="bg-surface border border-slate-800 rounded-2xl p-6 hover:border-gold-500/30 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">{g.skillName}</div>
                      <h3 className="font-heading text-xl font-semibold mt-1 text-slate-50">Reach {g.targetLevel}</h3>
                      {g.title && <p className="text-sm text-slate-400 mt-1">{g.title}</p>}
                    </div>
                    <Badge variant="outline" className={`${statusStyle(g.status)} font-mono text-[10px]`} data-testid={`goal-status-${g.id}`}>{g.status}</Badge>
                  </div>
                  <div className="mt-5">
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5 font-mono">
                      <span>{g.currentProficiency}% / {g.targetProficiency}%</span>
                      <span>Due {new Date(g.deadline).toLocaleDateString()}</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1.2, ease: "easeOut" }} className="h-full bg-gold-500 rounded-full shadow-glow-gold" />
                    </div>
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    {!g.completed && g.status !== "Completed" && (
                      <Button size="sm" variant="outline" onClick={() => complete(g)} className="border-emerald/40 text-emerald hover:bg-emerald/10" data-testid={`goal-complete-${g.id}`}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark done
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => removeGoal(g.id)} className="text-slate-400 hover:text-coral hover:bg-slate-800" data-testid={`goal-delete-${g.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-surface border-slate-800 text-slate-100">
          <DialogHeader><DialogTitle className="font-heading text-2xl text-slate-50">New goal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Title (optional)</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="Master React by exam" data-testid="goal-title-input" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Skill</Label>
              <Select value={form.skillId} onValueChange={(v) => setForm({ ...form, skillId: v })}>
                <SelectTrigger data-testid="goal-skill-select" className="mt-1 bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                <SelectContent>{skills.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
              {errors.skillId && <p className="text-xs text-coral mt-1" data-testid="goal-skill-error">{errors.skillId}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Target level</Label>
                <Select value={form.targetLevel} onValueChange={(v) => setForm({ ...form, targetLevel: v })}>
                  <SelectTrigger data-testid="goal-level-select" className="mt-1 bg-slate-900 border-slate-800"><SelectValue /></SelectTrigger>
                  <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Deadline</Label>
                <Input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" data-testid="goal-deadline-input" />
                {errors.deadline && <p className="text-xs text-coral mt-1" data-testid="goal-deadline-error">{errors.deadline}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-300 hover:bg-slate-800">Cancel</Button>
              <Button onClick={submit} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="goal-save">Save goal</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
