import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Sparkles, BarChart3, Target, User, LogOut, Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/skills", label: "My Skills", icon: Sparkles, testId: "nav-skills" },
  { to: "/progress", label: "Progress", icon: BarChart3, testId: "nav-progress" },
  { to: "/goals", label: "Goals", icon: Target, testId: "nav-goals" },
  { to: "/profile", label: "Profile", icon: User, testId: "nav-profile" },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Force dark theme always — single visual identity, no toggle.
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [location.pathname]);

  const SidebarContents = (
    <>
      <div className="px-6 pt-7 pb-6 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gold-500 flex items-center justify-center font-heading font-bold text-ink shadow-glow-gold">S</div>
          <div>
            <div className="font-heading text-lg font-semibold tracking-tight text-slate-50">SkillMap</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-mono">v.01 — leveling up</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            data-testid={n.testId}
            className={({ isActive }) =>
              `group relative flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-slate-800 text-gold-500"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div layoutId="navActiveBar" className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-gold-500 shadow-glow-gold" />
                )}
                <n.icon className="h-4 w-4" />
                <span>{n.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div className="flex items-center gap-3 px-2">
          {user?.avatar ? (
            <img src={user.avatar.startsWith("/api/") ? `${(process.env.REACT_APP_BACKEND_URL || "")}${user.avatar}` : user.avatar} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-gold-500/40" />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gold-500 flex items-center justify-center text-ink font-semibold">
              {user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate" data-testid="sidebar-user-name">{user?.name}</div>
            <div className="text-[11px] text-slate-500 truncate font-mono">{user?.email}</div>
          </div>
        </div>
        <button
          data-testid="logout-button"
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-coral/15 hover:text-coral text-xs transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-ink text-slate-100">
      <Toaster richColors theme="dark" position="top-right" />

      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed top-0 left-0 h-screen w-64 flex-col bg-navy-800 border-r border-slate-800 z-30">
        {SidebarContents}
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-navy-800 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gold-500 flex items-center justify-center font-bold text-ink shadow-glow-gold">S</div>
          <span className="font-heading font-semibold text-slate-50">SkillMap</span>
        </div>
        <button
          data-testid="mobile-drawer-toggle"
          onClick={() => setDrawerOpen(true)}
          className="p-2 rounded-lg bg-slate-800 text-slate-200"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setDrawerOpen(false)}
              data-testid="mobile-drawer-backdrop"
            />
            <motion.aside
              initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="md:hidden fixed top-0 left-0 h-screen w-72 z-50 flex flex-col bg-navy-800 border-r border-slate-800"
              data-testid="mobile-drawer"
            >
              <button
                onClick={() => setDrawerOpen(false)}
                className="absolute top-3 right-3 p-2 rounded-lg bg-slate-800 text-slate-200"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
              {SidebarContents}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main with crossfade */}
      <main className="md:pl-64 pb-24 md:pb-0 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="px-5 md:px-10 py-6 md:py-10 max-w-7xl mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-navy-800 border-t border-slate-800 flex justify-around py-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === "/"}
            data-testid={`mobile-${n.testId}`}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-3 py-1 text-[10px] transition-colors ${
                isActive ? "text-gold-500" : "text-slate-500"
              }`
            }
          >
            <n.icon className="h-5 w-5" />
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
