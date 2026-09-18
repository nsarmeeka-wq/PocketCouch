import React from 'react';
import { Home, Compass, Layers, HelpCircle, Sparkles } from 'lucide-react';

interface MobileBottomNavProps {
  currentSection: string;
  onNavigate: (sectionId: string) => void;
  onQuickDemo: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentSection,
  onNavigate,
  onQuickDemo,
}) => {
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-royal-950/95 backdrop-blur-xl border-t border-gold/25 px-2 py-2 safe-area-pb">
      <div className="flex items-center justify-around">
        
        <button
          onClick={() => onNavigate('hero')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentSection === 'hero' ? 'text-gold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => onNavigate('explorer')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentSection === 'explorer' ? 'text-gold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-5 h-5" />
          <span className="text-[10px] font-medium">Scanner</span>
        </button>

        {/* Center Quick Demo Button */}
        <button
          onClick={onQuickDemo}
          className="flex flex-col items-center -mt-5 p-2 rounded-2xl bg-gradient-to-tr from-saffron to-gold text-slate-950 shadow-lg shadow-saffron/30 active:scale-95 transition-transform"
        >
          <Sparkles className="w-6 h-6 stroke-[2.5]" />
          <span className="text-[9px] font-extrabold uppercase mt-0.5">Demo</span>
        </button>

        <button
          onClick={() => onNavigate('gallery')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentSection === 'gallery' ? 'text-gold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-5 h-5" />
          <span className="text-[10px] font-medium">Gallery</span>
        </button>

        <button
          onClick={() => onNavigate('heritage-quiz')}
          className={`flex flex-col items-center gap-1 p-1.5 rounded-xl transition-all ${
            currentSection === 'heritage-quiz' ? 'text-gold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HelpCircle className="w-5 h-5" />
          <span className="text-[10px] font-medium">Quiz</span>
        </button>

      </div>
    </div>
  );
};
