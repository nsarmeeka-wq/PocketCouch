import React from 'react';
import { Sparkles, Zap, Award } from 'lucide-react';

interface HackathonDemoBarProps {
  onSelectPreset: (id: string) => void;
  activeId?: string;
}

export const HackathonDemoBar: React.FC<HackathonDemoBarProps> = ({
  onSelectPreset,
  activeId,
}) => {
  const presets = [
    { id: 'konark_wheel', name: '1. Konark Sun Temple Wheel', state: 'Odisha', emoji: '🛞' },
    { id: 'madhubani_art', name: '2. Madhubani Art', state: 'Bihar', emoji: '🎨' },
    { id: 'warli_art', name: '3. Warli Tribal Art', state: 'Maharashtra', emoji: '🌾' },
    { id: 'chola_nataraja', name: '4. Chola Bronze Sculpture', state: 'Tamil Nadu', emoji: '🔱' },
    { id: 'banarasi_silk', name: '5. Banarasi Brocade Silk', state: 'Varanasi', emoji: '👘' },
  ];

  return (
    <div className="bg-gradient-to-r from-royal-950 via-royal-900 to-royal-950 border-b border-gold/30 py-2 px-4 sticky top-20 z-40 backdrop-blur-md shadow-md">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2.5">
        
        {/* Label */}
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gold shrink-0">
          <Award className="w-4 h-4 text-saffron animate-bounce" />
          <span>Hackathon Demo Mode:</span>
          <span className="hidden sm:inline text-slate-400 font-normal normal-case text-[11px]">
            Instant 1-Click Presentation Presets
          </span>
        </div>

        {/* 5 Preset Buttons */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {presets.map((p) => {
            const isActive = activeId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                  isActive
                    ? 'bg-gradient-to-r from-saffron to-gold text-slate-950 border-gold shadow-md font-bold'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 hover:border-gold/40'
                }`}
              >
                <span>{p.emoji}</span>
                <span>{p.name}</span>
                <span className={`text-[10px] opacity-75 hidden sm:inline ${isActive ? 'text-slate-900' : 'text-gold'}`}>
                  ({p.state})
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </div>
  );
};
