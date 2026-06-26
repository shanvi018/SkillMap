import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-ink">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-md">
        <div className="font-heading stat-num text-7xl md:text-8xl font-bold text-gold-500">404</div>
        <h2 className="font-heading text-2xl font-semibold mt-4 text-slate-50">Off the grid</h2>
        <p className="text-slate-400 mt-2 text-sm">That page doesn't exist — or hasn't been unlocked yet.</p>
        <Button asChild className="mt-6 bg-gold-500 hover:bg-gold-600 text-ink font-semibold" data-testid="notfound-go-back">
          <Link to="/">Back to dashboard</Link>
        </Button>
      </motion.div>
    </div>
  );
}
