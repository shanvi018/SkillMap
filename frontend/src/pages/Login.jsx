import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatApiError } from "@/lib/api";
import { Sparkles } from "lucide-react";

export default function Login() {
  const { login, guestLogin } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { toast.error("Enter email and password"); return; }
    setLoading(true);
    try { await login(form.email, form.password); toast.success("Welcome back"); navigate("/"); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  const guest = async () => {
    setLoading(true);
    try { await guestLogin(); toast.success("Demo grid loaded"); navigate("/"); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex bg-ink">
      <div className="hidden md:flex w-1/2 bg-navy-800 text-slate-50 relative overflow-hidden border-r border-slate-800">
        {/* Decorative grid */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.08]" aria-hidden>
          <defs>
            <pattern id="loginGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#F2B84B" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#loginGrid)" />
        </svg>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative z-10 p-14 flex flex-col justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-gold-500 flex items-center justify-center font-heading font-bold text-xl text-ink shadow-glow-gold">S</div>
            <div className="font-heading text-2xl font-semibold">SkillMap</div>
          </div>
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-500 text-[10px] uppercase tracking-[0.25em] mb-6 font-mono">
              <Sparkles className="h-3 w-3" /> student skill tracker
            </div>
            <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight max-w-md">Level up.<br/>Track every <span className="text-gold-500">unlock</span>.</h1>
            <p className="mt-5 text-slate-400 max-w-md">Watch your proficiency grids fill in. Set targets with deadlines. Mastery is a series of small consistent wins.</p>
          </div>
          <div className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.25em]">// for students who ship.</div>
        </motion.div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-10 bg-ink">
        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-sm space-y-5"
        >
          <div>
            <h2 className="font-heading text-3xl font-bold text-slate-50">Welcome back</h2>
            <p className="text-sm text-slate-400 mt-1">Log in to continue your run.</p>
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Email</Label>
            <Input data-testid="login-email-input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="you@university.edu" />
          </div>
          <div>
            <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Password</Label>
            <Input data-testid="login-password-input" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="mt-1 bg-slate-900 border-slate-800" placeholder="••••••••" />
          </div>
          <Button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="login-submit-button">
            {loading ? "Logging in..." : "Log in"}
          </Button>
          <Button type="button" variant="outline" onClick={guest} disabled={loading} className="w-full border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800" data-testid="guest-login-button">
            Try as Guest
          </Button>
          <div className="text-center text-sm text-slate-400 space-y-1">
            <div><Link to="/forgot-password" className="text-gold-500 hover:underline" data-testid="forgot-password-link">Forgot password?</Link></div>
            <div>New here? <Link to="/register" className="text-gold-500 font-medium hover:underline" data-testid="register-link">Create account</Link></div>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
