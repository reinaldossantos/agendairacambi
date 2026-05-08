export default function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-white/5 border border-surface-variant dark:border-white/10 rounded-xl p-4 animate-pulse">
      <div className="flex justify-between mb-3">
        <div className="w-24 h-4 bg-surface-variant dark:bg-white/10 rounded-full" />
        <div className="w-16 h-4 bg-surface-variant dark:bg-white/10 rounded-full" />
      </div>
      <div className="w-32 h-3 bg-surface-variant dark:bg-white/10 rounded mb-2" />
      <div className="w-full h-5 bg-surface-variant dark:bg-white/10 rounded mb-2" />
      <div className="w-3/4 h-5 bg-surface-variant dark:bg-white/10 rounded mb-4" />
      <div className="flex justify-between items-center pt-3 border-t border-surface-variant dark:border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-surface-variant dark:bg-white/10" />
          <div className="w-20 h-3 bg-surface-variant dark:bg-white/10 rounded" />
        </div>
        <div className="w-6 h-6 bg-surface-variant dark:bg-white/10 rounded-full" />
      </div>
    </div>
  );
}