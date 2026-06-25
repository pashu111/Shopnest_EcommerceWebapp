export default function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="aspect-[4/3] bg-slate-200" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="flex items-center justify-between pt-1">
          <div className="h-5 bg-slate-200 rounded w-1/3" />
          <div className="h-3 bg-slate-100 rounded w-1/4" />
        </div>
        <div className="h-9 bg-slate-200 rounded-full w-full mt-2" />
      </div>
    </div>
  );
}
