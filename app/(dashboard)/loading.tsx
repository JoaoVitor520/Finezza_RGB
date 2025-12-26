export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="h-72 rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        <div className="h-72 rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-36 rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse"
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="h-64 rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
          <div className="h-64 rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        </div>
        <div className="space-y-6 lg:col-span-1">
          <div className="h-56 rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
          <div className="h-56 rounded-2xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        </div>
      </div>

      <div className="space-y-6">
        <div className="h-[420px] rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        <div className="h-[420px] rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-96 rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
          <div className="h-96 rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
        </div>
        <div className="h-[420px] rounded-3xl border border-white/40 bg-white/60 shadow-lg shadow-indigo-500/10 backdrop-blur-xl animate-pulse" />
      </div>
    </div>
  );
}
