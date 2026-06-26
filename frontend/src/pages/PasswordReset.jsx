import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Mail, KeyRound } from "lucide-react";

export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetUrl, setResetUrl] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Valid email required"); return; }
    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      toast.success("If the email exists, a reset link was generated");
      if (data.resetToken) {
        setResetUrl(`${window.location.origin}/reset-password?token=${data.resetToken}`);
      }
    } catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
        <div className="h-12 w-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center"><Mail className="h-6 w-6 text-gold-500" /></div>
        <h2 className="font-heading text-3xl font-bold text-slate-50">Forgot password?</h2>
        <p className="text-sm text-slate-400">Enter your email and we'll send you a reset link.</p>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Email</Label>
          <Input data-testid="forgot-email-input" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 bg-slate-900 border-slate-800" placeholder="you@university.edu" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="forgot-submit-button">
          {loading ? "Sending..." : "Send reset link"}
        </Button>
        {resetUrl && (
          <div className="text-xs text-slate-300 bg-slate-900 border border-slate-800 rounded-lg p-3 break-all font-mono" data-testid="reset-url-debug">
            <div className="font-medium text-gold-500 mb-1">demo: copy this reset link</div>
            <a href={resetUrl} className="text-gold-400 underline">{resetUrl}</a>
          </div>
        )}
        <div className="text-center text-sm">
          <Link to="/login" className="text-gold-500 hover:underline" data-testid="back-to-login">Back to login</Link>
        </div>
      </motion.form>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 6) { toast.error("Min 6 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    if (!token) { toast.error("Missing token"); return; }
    setLoading(true);
    try { await api.post("/auth/reset-password", { token, password }); toast.success("Password updated — please log in"); navigate("/login"); }
    catch (err) { toast.error(formatApiError(err)); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
      <motion.form onSubmit={submit} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm space-y-5">
        <div className="h-12 w-12 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center"><KeyRound className="h-6 w-6 text-gold-500" /></div>
        <h2 className="font-heading text-3xl font-bold text-slate-50">Reset password</h2>
        <p className="text-sm text-slate-400">Choose a new password for your account.</p>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 bg-slate-900 border-slate-800" data-testid="reset-password-input" />
        </div>
        <div>
          <Label className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="mt-1 bg-slate-900 border-slate-800" data-testid="reset-password-confirm" />
        </div>
        <Button type="submit" disabled={loading} className="w-full bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="reset-submit-button">
          {loading ? "Updating..." : "Update password"}
        </Button>
      </motion.form>
    </div>
  );
}
