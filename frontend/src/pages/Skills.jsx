import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api, formatApiError, API } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Search, Download, Upload } from "lucide-react";
import ProgressRing from "@/components/ProgressRing";
import SkillModal from "@/components/SkillModal";
import EmptyState from "@/components/EmptyState";
import { SkillsEmptyIllustration } from "@/components/EmptyIllustration";
import { toast } from "sonner";

const CATEGORIES = ["All", "Frontend", "Backend", "DevOps", "Design", "Data Science", "Mobile", "Other"];
const LEVELS = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];
const STATUSES = ["All", "Learning", "Mastered", "Paused"];

function statusColor(s) {
  if (s === "Mastered") return "border-emerald/40 text-emerald bg-emerald/10";
  if (s === "Paused") return "border-coral/40 text-coral bg-coral/10";
  return "border-gold-500/40 text-gold-500 bg-gold-500/10";
}
function levelColor(l) {
  if (l === "Expert") return "border-emerald/40 text-emerald bg-emerald/10";
  if (l === "Advanced") return "border-gold-500/40 text-gold-500 bg-gold-500/10";
  return "border-slate-700 text-slate-300 bg-slate-800";
}

function crossedThreshold(prev, next) {
  if (prev == null) return null;
  if (prev < 50 && next >= 50) return "Intermediate";
  if (prev < 80 && next >= 80) return "Advanced";
  if (prev < 100 && next >= 100) return "Mastered";
  return null;
}

export default function Skills() {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [level, setLevel] = useState("All");
  const [status, setStatus] = useState("All");
  const [sortBy, setSortBy] = useState("updatedAt");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [selected, setSelected] = useState([]);
  const [flashId, setFlashId] = useState(null);
  const [flashMsg, setFlashMsg] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/skills");
      setSkills(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let r = [...skills];
    if (search) r = r.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    if (category !== "All") r = r.filter((s) => s.category === category);
    if (level !== "All") r = r.filter((s) => s.level === level);
    if (status !== "All") r = r.filter((s) => s.status === status);
    r.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "proficiency") return b.proficiency - a.proficiency;
      if (sortBy === "createdAt") return (b.createdAt || "").localeCompare(a.createdAt || "");
      return (b.updatedAt || "").localeCompare(a.updatedAt || "");
    });
    return r;
  }, [skills, search, category, level, status, sortBy]);

  const toggleSelect = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this skill?")) return;
    try {
      await api.delete(`/skills/${id}`);
      toast.success("Skill deleted");
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const bulkDelete = async () => {
    if (!selected.length) return;
    if (!window.confirm(`Delete ${selected.length} skill(s)?`)) return;
    try {
      await api.delete("/skills/bulk", { data: { ids: selected } });
      toast.success(`Deleted ${selected.length} skill(s)`);
      setSelected([]);
      load();
    } catch (e) { toast.error(formatApiError(e)); }
  };

  const exportCSV = async () => {
    try {
      const token = localStorage.getItem("skillmap_token");
      const res = await fetch(`${API}/skills/export`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "skillmap-skills.csv"; a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch { toast.error("Export failed"); }
  };

  const importCSV = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const text = await file.text();
    try {
      const { data } = await api.post("/skills/import", { csv: text });
      toast.success(`Imported ${data.imported} skill(s)`);
      load();
    } catch (err) { toast.error(formatApiError(err)); }
    e.target.value = "";
  };

  // Called by SkillModal after save with the previous proficiency for celebration detection
  const handleSaved = (prev, updated) => {
    if (updated && prev != null) {
      const crossed = crossedThreshold(prev, updated.proficiency);
      if (crossed) {
        setFlashId(updated.id);
        setFlashMsg(`Leveled up to ${crossed}!`);
        toast.success(`${updated.name} → ${crossed}`, { description: "Threshold crossed. Keep going." });
        setTimeout(() => setFlashId(null), 1800);
      }
    }
    load();
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// library</div>
          <h1 className="font-heading text-4xl font-bold mt-2 text-slate-50">My Skills</h1>
          <p className="text-slate-400 mt-1 text-sm">Search, sort, filter, and refine your tree.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {selected.length > 0 && (
            <Button variant="destructive" onClick={bulkDelete} data-testid="skills-bulk-delete" className="bg-coral hover:bg-coral-600 text-white">
              <Trash2 className="h-4 w-4 mr-2" /> Delete ({selected.length})
            </Button>
          )}
          <Button variant="outline" onClick={exportCSV} data-testid="skills-export-csv" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <label className="inline-flex">
            <input type="file" accept=".csv" className="hidden" data-testid="skills-import-csv" onChange={importCSV} />
            <Button asChild variant="outline" className="cursor-pointer border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" type="button">
              <span><Upload className="h-4 w-4 mr-2" /> Import</span>
            </Button>
          </label>
          <Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="skills-add-button">
            <Plus className="h-4 w-4 mr-2" /> Add skill
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input data-testid="skills-search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search skills..." className="pl-9 bg-slate-900 border-slate-800 text-slate-100" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger data-testid="filter-category" className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={level} onValueChange={setLevel}>
          <SelectTrigger data-testid="filter-level" className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>{LEVELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger data-testid="filter-status" className="bg-slate-900 border-slate-800 text-slate-100"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>{STATUSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-500 font-mono uppercase text-[10px] tracking-[0.25em]">sort</span>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44 h-9 bg-slate-900 border-slate-800 text-slate-200" data-testid="skills-sort"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="updatedAt">Last updated</SelectItem>
            <SelectItem value="createdAt">Date added</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="proficiency">Proficiency</SelectItem>
          </SelectContent>
        </Select>
        <span className="ml-auto text-slate-500 text-xs font-mono">{filtered.length} skill{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 rounded-2xl bg-slate-800/50 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          illustration={<SkillsEmptyIllustration />}
          title="The map is blank — for now"
          description="Drop your first skill in. The tree grows one node at a time, and your activity grid starts the moment you log one update."
          action={<Button onClick={() => { setEditing(null); setOpen(true); }} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="empty-add-skill">
            <Plus className="h-4 w-4 mr-2" /> Add your first skill
          </Button>}
          testId="skills-empty"
        />
      ) : (
        <motion.div
          initial="hidden" animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          <AnimatePresence>
            {filtered.map((s) => (
              <motion.div
                key={s.id}
                variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.4 }}
                whileHover={{ y: -3 }}
                data-testid={`skill-card-${s.id}`}
                className={`bg-surface border border-slate-800 rounded-2xl p-5 hover:border-gold-500/30 transition-colors ${flashId === s.id ? "animate-level-flash" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} data-testid={`skill-checkbox-${s.id}`} className="mt-1 border-slate-700" />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <h3 className="font-heading text-lg font-semibold truncate text-slate-50">{s.name}</h3>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <Badge variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 font-mono text-[10px]">{s.category}</Badge>
                          <Badge variant="outline" className={`${statusColor(s.status)} font-mono text-[10px]`}>{s.status}</Badge>
                          <Badge variant="outline" className={`${levelColor(s.level)} font-mono text-[10px]`}>{s.level}</Badge>
                        </div>
                      </div>
                      <ProgressRing value={s.proficiency} size={76} stroke={7} color={s.level === "Expert" ? "#2DD4A0" : "#F2B84B"} />
                    </div>
                    {s.notes && <p className="mt-3 text-xs text-slate-500 line-clamp-2">{s.notes}</p>}
                    {flashId === s.id && (
                      <div className="mt-2 text-xs text-emerald font-mono">⚡ {flashMsg}</div>
                    )}
                    <div className="mt-4 flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => { setEditing(s); setOpen(true); }} data-testid={`skill-edit-${s.id}`} className="text-slate-400 hover:text-gold-500 hover:bg-slate-800">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} data-testid={`skill-delete-${s.id}`} className="text-slate-400 hover:text-coral hover:bg-slate-800">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      <SkillModal
        open={open}
        onClose={() => { setOpen(false); setEditing(null); }}
        skill={editing}
        onSaved={(updated) => handleSaved(editing?.proficiency, updated)}
      />
    </div>
  );
}
