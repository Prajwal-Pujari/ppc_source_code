export default function GaugeCalibrationLoader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] py-20 mx-auto w-full relative">
      {/* Main Calibration Canvas */}
      <div className="relative flex flex-col items-center justify-center">
        {/* Precision Orbital Rings Graphic */}
        <div className="relative w-80 h-80 flex items-center justify-center mb-16">
          {/* Ring 1: Outer Micrometer Scale */}
          <div className="absolute inset-0 rounded-full border-[1px] border-[var(--stone)] flex items-center justify-center animate-[spin_60s_linear_infinite]">
            <div className="absolute inset-0 rounded-full micrometer-ticks opacity-30 [mask-image:radial-gradient(transparent_65%,black_66%)]"></div>
            <div className="absolute top-0 -mt-1 w-2 h-2 rounded-full bg-[var(--stone)]"></div>
            <div className="absolute bottom-0 -mb-1 w-2 h-2 rounded-full bg-[var(--stone)]"></div>
            <div className="absolute left-0 -ml-1 w-2 h-2 rounded-full bg-[var(--stone)]"></div>
            <div className="absolute right-0 -mr-1 w-2 h-2 rounded-full bg-[var(--stone)]"></div>
          </div>

          {/* Ring 2: Primary Data Track */}
          <div className="absolute inset-6 rounded-full border-[2px] border-[var(--copper-bronze)]/20 flex items-center justify-center animate-[spin_40s_linear_infinite_reverse]">
            <div className="absolute w-full h-full rounded-full border border-dashed border-[var(--copper-bronze)]/60"></div>
            {/* Data Markers */}
            <div className="absolute top-[-3px] w-6 h-[6px] bg-[var(--copper-bronze)] rounded-sm"></div>
            <div className="absolute bottom-[-3px] w-6 h-[6px] bg-[var(--copper-bronze)] rounded-sm"></div>
            <div className="absolute left-[-3px] w-[6px] h-6 bg-[var(--copper-bronze)] rounded-sm"></div>
            <div className="absolute right-[-3px] w-[6px] h-6 bg-[var(--copper-bronze)] rounded-sm"></div>
          </div>

          {/* Ring 3: Fine Adjustment Core */}
          <div className="absolute inset-16 rounded-full border-[3px] border-[var(--copper-dark)]/10 shadow-[inset_0_0_20px_rgba(139,105,20,0.1)] flex items-center justify-center animate-[spin_20s_linear_infinite]">
            <div className="absolute inset-0 rounded-full micrometer-ticks-fine opacity-50 [mask-image:radial-gradient(transparent_68%,black_69%)]"></div>
            <div className="absolute inset-2 rounded-full border border-[var(--copper-dark)]/30"></div>
          </div>

          {/* Central Alignment Reticle */}
          <div className="absolute inset-28 rounded-full border border-[var(--ash)]/20 bg-white/50 backdrop-blur-sm flex items-center justify-center">
            {/* Crosshairs */}
            <div className="absolute w-[120%] h-[1px] bg-[var(--stone)]/50"></div>
            <div className="absolute h-[120%] w-[1px] bg-[var(--stone)]/50"></div>
            {/* Center point */}
            <div className="absolute w-2 h-2 rounded-full bg-[var(--copper-dark)] ring-4 ring-[var(--copper-dark)]/20 animate-pulse"></div>
            <div className="absolute w-[1px] h-2 bg-[var(--bone-white)]"></div>
            <div className="absolute h-[1px] w-2 bg-[var(--bone-white)]"></div>
          </div>

          {/* Floating Measurement Indicators (Static) */}
          <div className="absolute top-8 left-8 bg-white/80 backdrop-blur px-2 py-1 rounded-sm border border-[var(--stone)]/30 text-[0.65rem] font-mono text-[var(--copper-bronze)] shadow-sm">
            +0.005 μm
          </div>
          <div className="absolute bottom-10 right-8 bg-white/80 backdrop-blur px-2 py-1 rounded-sm border border-[var(--stone)]/30 text-[0.65rem] font-mono text-[var(--ash)] shadow-sm">
            R: 1.4882
          </div>
        </div>

        {/* Typography & Status */}
        <div className="flex flex-col items-center space-y-4">
          <h1 className="text-sm tracking-[0.15em] text-[var(--copper-dark)] font-mono font-medium">
            CALIBRATING GAUGE TOLERANCES<span className="animate-pulse">...</span>
          </h1>
          
          <div className="flex items-center space-x-6 text-xs font-mono text-[var(--ash)]">
            <span className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[1rem] text-[var(--copper-dark)]/70">check_circle</span>
              <span>AXIS X</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="material-symbols-outlined text-[1rem] text-[var(--copper-dark)]/70">check_circle</span>
              <span>AXIS Y</span>
            </span>
            <span className="flex items-center space-x-2 opacity-50">
              <span className="material-symbols-outlined text-[1rem]">pending</span>
              <span>AXIS Z</span>
            </span>
          </div>

          {/* Precision Progress Bar */}
          <div className="w-64 h-[2px] bg-[var(--silk)] mt-6 rounded-full overflow-hidden relative">
            <div className="absolute top-0 left-0 h-full w-[65%] bg-gradient-to-r from-[var(--copper-dark)] to-[var(--copper-bronze)] rounded-full animate-[progress_2s_ease-in-out_infinite]"></div>
            
            {/* Ghost tick marks across the bar */}
            <div className="absolute inset-0 w-full h-full flex justify-between px-[10%] opacity-20">
              <div className="w-[1px] h-full bg-[var(--charcoal)]"></div>
              <div className="w-[1px] h-full bg-[var(--charcoal)]"></div>
              <div className="w-[1px] h-full bg-[var(--charcoal)]"></div>
              <div className="w-[1px] h-full bg-[var(--charcoal)]"></div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .micrometer-ticks {
          background: repeating-conic-gradient(
            from 0deg,
            var(--stone) 0deg 1deg,
            transparent 1deg 10deg
          );
        }
        .micrometer-ticks-fine {
          background: repeating-conic-gradient(
            from 0deg,
            var(--copper-bronze) 0deg 0.5deg,
            transparent 0.5deg 5deg
          );
        }
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 100%; }
          100% { width: 0%; }
        }
      `}</style>
    </div>
  );
}
