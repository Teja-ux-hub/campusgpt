'use client';

export default function QueryCounter({ queryUsed, queryMax, onBack }) {
  const percentage = Math.min((queryUsed / queryMax) * 100, 100);
  
  // Green -> Yellow -> Red
  let barColor = 'bg-[#34d399]';
  let glowColor = 'shadow-[0_0_10px_#34d39933]';
  if (percentage > 80) {
    barColor = 'bg-red-500';
    glowColor = 'shadow-[0_0_10px_#ef444433]';
  } else if (percentage > 50) {
    barColor = 'bg-yellow-500';
    glowColor = 'shadow-[0_0_10px_#eab30833]';
  }

  return (
    <div className="w-full bg-[#060606] border-b border-white/5 px-4 py-2 flex items-center justify-between text-[10px] tracking-widest font-mono text-zinc-500">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className={`w-1 h-1 rounded-full ${barColor} animate-pulse`} />
          <span>DAILY QUERIES</span>
        </div>
        <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden relative">
          <div 
            className={`h-full ${barColor} ${glowColor} transition-all duration-500 ease-out`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-zinc-400">{queryUsed}/{queryMax}</span>
      </div>
      <div className="flex items-center gap-4">
        <span>{queryMax - queryUsed} LEFT</span>
        {onBack && (
          <button 
            onClick={onBack}
            className="hover:text-zinc-100 transition-colors uppercase"
          >
            [BACK]
          </button>
        )}
      </div>
    </div>
  );
}
