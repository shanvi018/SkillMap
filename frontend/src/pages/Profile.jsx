import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import jsPDF from "jspdf";
import { useAuth } from "@/contexts/AuthContext";
import { api, formatApiError, resolveAvatar, API } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Download, Save, Trash2, Copy, ExternalLink, AtSign } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["#F2B84B", "#2DD4A0", "#FF6B4A", "#8B5CF6", "#0EA5E9", "#D69A2A", "#64748B"];

export default function Profile() {
  const { user, updateProfile, logout, refresh } = useAuth();
  const [form, setForm] = useState({ name: "", course: "", branch: "", year: "", bio: "", avatar: "", username: "", publicProfile: true });
  const [skills, setSkills] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) setForm({
      name: user.name || "", course: user.course || "", branch: user.branch || "",
      year: user.year || "", bio: user.bio || "", avatar: user.avatar || "",
      username: user.username || "", publicProfile: user.publicProfile !== false,
    });
  }, [user]);

  useEffect(() => { api.get("/skills").then((r) => setSkills(r.data)); }, []);

  const breakdown = useMemo(() => {
    const map = {};
    for (const s of skills) map[s.category] = (map[s.category] || 0) + 1;
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [skills]);

  const save = async () => {
    setSaving(true);
    try {
      // Don't send avatar back if it's already an /api/ URL (server-managed)
      const payload = { ...form };
      if (payload.avatar?.startsWith("/api/")) delete payload.avatar;
      await updateProfile(payload);
      toast.success("Profile saved");
    } catch (e) { toast.error(formatApiError(e)); }
    finally { setSaving(false); }
  };

  const onAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Pick an image file"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/upload/avatar", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, avatar: data.avatar }));
      await refresh();
      toast.success("Avatar uploaded");
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setUploading(false); e.target.value = ""; }
  };

  const copyShareLink = async () => {
    if (!form.username) { toast.error("Set a username first"); return; }
    const url = `${window.location.origin}/u/${form.username}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied", { description: url });
    } catch { toast.error("Couldn't copy — please copy manually"); }
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("SkillMap — Skills Report", 20, 22);
    doc.setFontSize(12);
    doc.text(`${user?.name || ""}  ·  ${user?.email || ""}`, 20, 32);
    if (form.username) doc.text(`@${form.username}  ·  ${window.location.origin}/u/${form.username}`, 20, 40);
    doc.text(`${user?.course || ""} ${user?.branch || ""} ${user?.year || ""}`.trim(), 20, 48);
    let y = 64;
    doc.setFontSize(14); doc.text("Skills", 20, y); y += 8;
    doc.setFontSize(11);
    skills.forEach((s) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`• ${s.name} — ${s.category}  [${s.level}]  ${s.proficiency}%  (${s.status})`, 22, y);
      y += 7;
    });
    doc.save(`skillmap-${user?.name?.replace(/\s+/g, "-").toLowerCase() || "report"}.pdf`);
    toast.success("PDF exported");
  };

  const deleteAccount = async () => {
    if (!window.confirm("Permanently delete your account and all data? This cannot be undone.")) return;
    try { await api.delete("/profile"); logout(); }
    catch (e) { toast.error(formatApiError(e)); }
  };

  const avatarSrc = resolveAvatar(form.avatar);
  const shareUrl = form.username ? `${window.location.origin}/u/${form.username}` : "";

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs uppercase tracking-[0.25em] text-gold-500 font-mono">// account</div>
        <h1 className="font-heading text-4xl font-bold mt-2 text-slate-50">Profile</h1>
        <p className="text-slate-400 mt-1 text-sm">Tune your identity. Share your map. Export your record.</p>
      </div>

      {/* Public share strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="bg-surface border border-gold-500/30 rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-4"
        data-testid="public-share-strip"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="h-10 w-10 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
            <AtSign className="h-5 w-5 text-gold-500" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-slate-500">your public link</div>
            <div className="text-sm font-mono text-slate-200 truncate" data-testid="share-link">
              {shareUrl || "Set a username to enable sharing"}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={copyShareLink} disabled={!form.username} variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" data-testid="copy-share-link">
            <Copy className="h-4 w-4 mr-1" /> Copy link
          </Button>
          {form.username && (
            <Button asChild variant="outline" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" data-testid="open-public-profile">
              <a href={shareUrl} target="_blank" rel="noreferrer">
                Open <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </Button>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-surface border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-4">
            <label htmlFor="avatar-upload" className="cursor-pointer relative">
              {avatarSrc ? (
                <img src={avatarSrc} alt="avatar" className="h-16 w-16 rounded-xl object-cover ring-2 ring-gold-500/40" data-testid="profile-avatar-preview" />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-gold-500 text-ink flex items-center justify-center text-2xl font-heading font-bold shadow-glow-gold">
                  {form.name?.[0]?.toUpperCase() || "U"}
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 rounded-xl bg-ink/70 flex items-center justify-center">
                  <div className="h-5 w-5 rounded-full border-2 border-gold-500 border-t-transparent animate-spin" />
                </div>
              )}
            </label>
            <input
              id="avatar-upload"
              type="file"
              accept="image/*"
              className="hidden"
              data-testid="profile-avatar-upload"
              onChange={onAvatarFile}
            />
            <div className="flex-1">
              <h3 className="font-heading text-xl font-semibold text-slate-50">{form.name}</h3>
              <p className="text-sm text-slate-400 font-mono">{user?.email}</p>
              <p className="text-xs text-slate-500 mt-0.5">Click avatar to upload (≤2MB) — stored in object storage</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Display name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" data-testid="profile-name-input" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Username (public handle)</Label>
              <div className="mt-1 flex items-center gap-2">
                <div className="text-slate-500 font-mono text-sm">@</div>
                <Input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase() })} className="bg-slate-900 border-slate-800 font-mono" placeholder="your-handle" data-testid="profile-username-input" />
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Course</Label>
              <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" data-testid="profile-course-input" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Branch</Label>
              <Input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" data-testid="profile-branch-input" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Year</Label>
              <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" data-testid="profile-year-input" />
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Bio</Label>
            <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="Tell us a bit about yourself" data-testid="profile-bio-input" />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-3">
            <div>
              <div className="text-sm text-slate-100">Public profile</div>
              <div className="text-xs text-slate-500">Allow anyone with your link to view your skill map</div>
            </div>
            <Switch checked={form.publicProfile} onCheckedChange={(v) => setForm({ ...form, publicProfile: v })} data-testid="profile-public-toggle" />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={save} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="profile-save-button">
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save changes"}
            </Button>
            <Button variant="outline" onClick={exportPDF} data-testid="profile-export-pdf" className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800">
              <Download className="h-4 w-4 mr-1" /> Export PDF
            </Button>
            <Button variant="ghost" onClick={deleteAccount} className="text-coral hover:bg-coral/10 ml-auto" data-testid="profile-delete-account">
              <Trash2 className="h-4 w-4 mr-1" /> Delete account
            </Button>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-slate-800 rounded-2xl p-6">
          <h3 className="font-heading text-lg font-semibold text-slate-50">Category breakdown</h3>
          <p className="text-[10px] text-slate-500 mb-3 font-mono uppercase tracking-[0.25em]">skills by category</p>
          {breakdown.length ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={3} stroke="#0B1120">
                    {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#0B1120", border: "1px solid #1E293B", color: "white", borderRadius: 8 }} />
                  <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-slate-500 text-center py-12 font-mono">No data — add skills to see your spread.</div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
