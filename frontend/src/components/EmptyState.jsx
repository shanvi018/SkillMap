import { motion } from "framer-motion";

export default function EmptyState({ icon: Icon, illustration, title, description, action, testId }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      data-testid={testId}
      className="border border-dashed border-slate-800 rounded-2xl p-10 md:p-16 text-center bg-surface"
    >
      {illustration ? (
        <div className="mb-6">{illustration}</div>
      ) : Icon ? (
        <div className="mx-auto mb-5 h-14 w-14 rounded-2xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
          <Icon className="h-7 w-7 text-gold-500" />
        </div>
      ) : null}
      <h3 className="font-heading text-xl font-semibold text-slate-50">{title}</h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </motion.div>
  );
}
