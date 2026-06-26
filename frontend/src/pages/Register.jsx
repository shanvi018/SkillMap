import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", course: "", branch: "", year: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Valid email required";
    if (form.password.length < 6) e.password = "Min 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try { await register(form); toast.success("Account created — welcome to SkillMap"); navigate("/"); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10 bg-ink">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md space-y-5"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="h-10 w-10 rounded-lg bg-gold-500 flex items-center justify-center font-heading font-bold text-ink shadow-glow-gold">S</div>
          <span className="font-heading text-xl font-semibold text-slate-50">SkillMap</span>
        </div>
        <div>
          <h2 className="font-heading text-3xl font-bold text-slate-50">Create your account</h2>
          <p className="text-sm text-slate-400 mt-1 font-mono">// initialize your skill grid</p>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Full name</Label>
          <Input data-testid="register-name-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" />
          {errors.name && <p className="text-xs text-coral mt-1">{errors.name}</p>}
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Email</Label>
          <Input data-testid="register-email-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" />
          {errors.email && <p className="text-xs text-coral mt-1">{errors.email}</p>}
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Password</Label>
          <Input data-testid="register-password-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" />
          {errors.password && <p className="text-xs text-coral mt-1">{errors.password}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Course</Label>
            <Input data-testid="register-course-input" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="B.Tech" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Year</Label>
            <Input data-testid="register-year-input" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="3rd Year" />
          </div>
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Branch</Label>
          <Input data-testid="register-branch-input" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="Computer Science" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="register-submit-button">
          {loading ? "Creating..." : "Create account"}
        </Button>
        <div className="text-center text-sm text-slate-400">
          Already have an account? <Link to="/login" className="text-gold-500 font-medium hover:underline" data-testid="login-link">Log in</Link>
        </div>
      </motion.form>
    </div>
  );
}
