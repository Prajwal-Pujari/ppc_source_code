export default function OperationFlowLoader() {
  return (
    <div className="w-full flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-2xl flex flex-col items-center justify-center gap-10 relative z-10 py-4 mx-auto scale-75 origin-center">
        {/* Central Animation Sequence Container */}
        <div className="flex items-center justify-center gap-3 sm:gap-6">
          {/* Step 1: Cutting (Completed) */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--linen)] flex items-center justify-center shadow-[0_4px_20px_0_rgba(139,105,20,0.04)] text-[var(--slate)] opacity-80">
              <span className="material-symbols-outlined text-[1.2rem] sm:text-[1.5rem]" style={{ fontVariationSettings: "'wght' 300" }}>content_cut</span>
            </div>
          </div>

          {/* Connector Line */}
          <div className="w-6 sm:w-12 h-[2px] bg-[var(--silk)] rounded-full"></div>

          {/* Step 2: Turning (Completed) */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--linen)] flex items-center justify-center shadow-[0_4px_20px_0_rgba(139,105,20,0.04)] text-[var(--slate)] opacity-80">
              <span className="material-symbols-outlined text-[1.2rem] sm:text-[1.5rem]" style={{ fontVariationSettings: "'wght' 300" }}>sync</span>
            </div>
          </div>

          {/* Connector Line */}
          <div className="w-6 sm:w-12 h-[2px] bg-[var(--silk)] rounded-full"></div>

          {/* Step 3: Drilling (Active - Highlighted) */}
          <div className="flex flex-col items-center gap-2 relative active-step-anim">
            {/* Copper Glow Base */}
            <div className="absolute inset-0 bg-[var(--copper-bronze)] blur-md opacity-30 rounded-full glow-pulse"></div>
            {/* Active Icon Container */}
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white flex items-center justify-center shadow-[0_8px_30px_0_rgba(48,49,47,0.08),_0_4px_15px_0_rgba(139,105,20,0.15)] text-[var(--copper-bronze)] relative z-10 icon-spin">
              <span className="material-symbols-outlined text-[1.5rem] sm:text-[2rem]" style={{ fontVariationSettings: "'wght' 400" }}>construction</span>
            </div>
          </div>

          {/* Connector Line */}
          <div className="w-6 sm:w-12 h-[2px] bg-[var(--silk)] rounded-full relative overflow-hidden">
             <div className="absolute top-0 left-0 h-full w-full bg-[var(--copper-bronze)] opacity-30 progress-line-anim"></div>
          </div>

          {/* Step 4: Hardening (Pending) */}
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--bone-white)] flex items-center justify-center text-[var(--stone)] opacity-50">
              <span className="material-symbols-outlined text-[1.2rem] sm:text-[1.5rem]" style={{ fontVariationSettings: "'wght' 200" }}>local_fire_department</span>
            </div>
          </div>

          {/* Connector Line */}
          <div className="w-6 sm:w-12 h-[2px] bg-[var(--warm-white)] rounded-full hidden md:block"></div>

          {/* Step 5: Wire Cut (Pending) */}
          <div className="flex flex-col items-center gap-2 hidden md:flex">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[var(--bone-white)] flex items-center justify-center text-[var(--stone)] opacity-50">
              <span className="material-symbols-outlined text-[1.2rem] sm:text-[1.5rem]" style={{ fontVariationSettings: "'wght' 200" }}>precision_manufacturing</span>
            </div>
          </div>
        </div>

        {/* Typography: Status Readout */}
        <div className="flex flex-col items-center gap-2 mt-4 text-center glass-panel px-8 py-4 rounded-xl shadow-[0_4px_20px_0_rgba(139,105,20,0.02)]">
          <h1 className="text-[1.1rem] sm:text-[1.25rem] font-medium tracking-tight text-[var(--charcoal)]">Operation Flow</h1>
          
          {/* Moving Text Container */}
          <div className="overflow-hidden w-64 h-5 mt-2 relative">
            <p className="font-mono text-xs sm:text-sm tracking-[0.05em] text-[var(--copper-bronze)] uppercase whitespace-nowrap moving-text-anim absolute">EXECUTING PRODUCTION SEQUENCE...</p>
          </div>
          
          <div className="font-mono text-[10px] sm:text-xs text-[var(--ash)] mt-1 tracking-widest">
            SYSTEM ALIGNMENT IN PROGRESS
          </div>
        </div>

        <style>{`
          .glass-panel {
            background: rgba(251, 249, 246, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
          }
          
          @keyframes subtlePulse {
            0%, 100% { opacity: 0.2; transform: scale(0.95); }
            50% { opacity: 0.5; transform: scale(1.15); }
          }
          
          @keyframes iconFloat {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
          }
          
          @keyframes progressLine {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          @keyframes movingText {
            0% { transform: translateX(100%); opacity: 0;}
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateX(-100%); opacity: 0;}
          }

          .glow-pulse {
            animation: subtlePulse 2s ease-in-out infinite;
          }
          
          .active-step-anim {
            animation: iconFloat 2.5s ease-in-out infinite;
          }
          
          .progress-line-anim {
            animation: progressLine 1.5s linear infinite;
          }
          
          .moving-text-anim {
            animation: movingText 4s linear infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
