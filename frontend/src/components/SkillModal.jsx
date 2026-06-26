import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { api, formatApiError } from "@/lib/api";

const CATEGORIES = ["Frontend", "Backend", "DevOps", "Design", "Data Science", "Mobile", "Other"];
const STATUSES = ["Learning", "Mastered", "Paused"];

function levelFrom(p) {
  if (p >= 85) return "Expert";
  if (p >= 65) return "Advanced";
  if (p >= 35) return "Intermediate";
  return "Beginner";
}

export default function SkillModal({ open, onClose, skill, onSaved }) {
  const [form, setForm] = useState({
    name: "", category: "Frontend", proficiency: 30, status: "Learning", notes: "", resources: [""],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (skill) {
      setForm({
        name: skill.name || "",
        category: skill.category || "Frontend",
        proficiency: skill.proficiency ?? 30,
        status: skill.status || "Learning",
        notes: skill.notes || "",
        resources: skill.resources?.length ? skill.resources : [""],
      });
    } else {
      setForm({ name: "", category: "Frontend", proficiency: 30, status: "Learning", notes: "", resources: [""] });
    }
  }, [skill, open]);

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Skill name is required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        category: form.category,
        proficiency: Number(form.proficiency),
        level: levelFrom(form.proficiency),
        status: form.status,
        notes: form.notes,
        resources: form.resources.filter((r) => r && r.trim()),
      };
      if (skill) {
        const { data } = await api.put(`/skills/${skill.id}`, payload);
        toast.success("Skill updated");
        onSaved?.(data);
      } else {
        const { data } = await api.post("/skills", payload);
        toast.success("Skill added");
        onSaved?.(data);
      }
      onClose();
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg" data-testid="skill-modal">
        <DialogHeader>
          <DialogTitle className="font-heading text-2xl">{skill ? "Edit Skill" : "Add a Skill"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-slate-500">Skill name</Label>
            <Input
              data-testid="skill-name-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. TypeScript"
              className="mt-1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-slate-500">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger data-testid="skill-category-select" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-slate-500">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="skill-status-select" className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-baseline">
              <Label className="text-xs uppercase tracking-widest text-slate-500">Proficiency</Label>
              <span className="font-heading text-lg font-semibold text-gold-500 stat-num">{form.proficiency}%</span>
            </div>
            <Slider
              data-testid="skill-proficiency-slider"
              value={[form.proficiency]}
              onValueChange={(v) => setForm({ ...form, proficiency: v[0] })}
              min={0}
              max={100}
              step={1}
              className="mt-3"
            />
            <div className="mt-1 text-xs text-slate-500">Level: <span className="font-medium">{levelFrom(form.proficiency)}</span></div>
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-slate-500">Notes</Label>
            <Textarea
              data-testid="skill-notes-input"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="What are you working on?"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-widest text-slate-500">Resources</Label>
            <div className="space-y-2 mt-1">
              {form.resources.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={r}
                    onChange={(e) => {
                      const next = [...form.resources]; next[i] = e.target.value;
                      setForm({ ...form, resources: next });
                    }}
                    placeholder="https://..."
                    data-testid={`skill-resource-input-${i}`}
                  />
                  <Button variant="ghost" size="icon"
                    onClick={() => setForm({ ...form, resources: form.resources.filter((_, idx) => idx !== i) })}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setForm({ ...form, resources: [...form.resources, ""] })} data-testid="skill-add-resource">
                <Plus className="h-4 w-4 mr-1" /> Add resource
              </Button>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={onClose} data-testid="skill-cancel">Cancel</Button>
            <Button onClick={submit} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="skill-save">
              {saving ? "Saving..." : skill ? "Update Skill" : "Add Skill"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
