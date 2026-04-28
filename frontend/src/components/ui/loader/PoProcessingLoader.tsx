export default function PoProcessingLoader() {
  return (
    <div className="flex flex-col items-center justify-center max-w-md w-full px-6 py-20 mx-auto">
      {/* Graphical Element: Document Scanner */}
      <div className="relative w-48 h-64 mb-12 flex items-center justify-center">
        {/* Document Base */}
        <div className="absolute inset-0 bg-[var(--bone-white)] rounded-lg shadow-[0_12px_40px_0_rgba(48,49,47,0.08)] border border-[var(--stone)] flex flex-col p-6 gap-4 z-10 overflow-hidden">
          {/* Data Lines (Simulated Document Content) */}
          <div className="w-full h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-3/4 h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-full h-[1px] bg-[var(--stone)] my-2"></div>
          <div className="w-full h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-5/6 h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-1/2 h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-full h-[1px] bg-[var(--stone)] my-2"></div>
          <div className="w-full h-2 bg-[var(--silk)] rounded-full opacity-60"></div>
          <div className="w-2/3 h-2 bg-[var(--silk)] rounded-full opacity-60"></div>

          {/* Parsed Data Nodes (Simulated active parsing) */}
          <div className="absolute top-12 left-8 w-1.5 h-1.5 rounded-full bg-[var(--copper-bronze)] shadow-[0_0_8px_rgba(139,105,20,0.8)] animate-pulse"></div>
          <div className="absolute top-28 left-16 w-1.5 h-1.5 rounded-full bg-[var(--copper-bronze)] shadow-[0_0_8px_rgba(139,105,20,0.8)] animate-pulse delay-75"></div>
          <div className="absolute top-44 left-10 w-1.5 h-1.5 rounded-full bg-[var(--copper-bronze)] shadow-[0_0_8px_rgba(139,105,20,0.8)] animate-pulse delay-150"></div>
        </div>

        {/* Scanning Bar Overlay */}
        <div className="absolute left-[-10%] right-[-10%] top-1/2 h-1 scan-line z-20 pointer-events-none animate-scan"></div>
        
        {/* Scanning Glow */}
        <div className="absolute left-0 right-0 top-1/2 h-16 bg-gradient-to-b from-[var(--copper-bronze)]/0 via-[var(--copper-bronze)]/10 to-[var(--copper-bronze)]/0 z-20 pointer-events-none transform -translate-y-1/2 animate-scan"></div>
      </div>

      {/* Typography / Status */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="material-symbols-outlined text-[var(--copper-bronze)] text-3xl mb-2" style={{ fontVariationSettings: "'FILL' 0, 'wght' 300" }}>
          barcode_scanner
        </span>
        <h1 className="font-mono text-sm tracking-[0.05em] text-[var(--copper-bronze)] uppercase">
          PARSING PURCHASE ORDER DATA...
        </h1>
        <p className="font-body text-xs text-[var(--ash)] mt-2">
          Extracting tolerances and compliance metrics
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="w-full max-w-[200px] h-1 bg-[var(--silk)] mt-12 rounded-full overflow-hidden">
        <div className="h-full bg-[var(--copper-bronze)] w-[65%] rounded-full opacity-80 animate-pulse"></div>
      </div>

      <style>{`
        .scan-line {
          background: linear-gradient(to right, transparent, rgba(139, 105, 20, 0.5), transparent);
          box-shadow: 0 0 10px rgba(139, 105, 20, 0.3);
        }
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
