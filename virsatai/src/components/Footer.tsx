import React from 'react';
import { Heart } from 'lucide-react';

interface FooterProps {
  onNavigate: (sectionId: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-gold/20 bg-royal-950 pt-16 pb-24 lg:pb-12 relative overflow-hidden">
      {/* Background Subtle Mandala */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-mandala-pattern opacity-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800">
          
          {/* Brand Col */}
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-saffron to-gold flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-saffron/20">
                <span>🪷</span>
              </div>
              <span className="text-2xl font-bold font-heritage tracking-wide text-white">
                Virasat<span className="text-saffron">AI</span>
              </span>
            </div>

            <p className="text-sm text-gold-warm font-medium">
              "Preserving Culture Through Artificial Intelligence"
            </p>

            <p className="text-xs text-slate-300 max-w-sm leading-relaxed">
              An AI-powered cultural discovery platform dedicated to decoding India’s monuments, traditional arts, sculptures, and textiles into native Indian languages through verified history and voice.
            </p>

            <div className="pt-2 text-xs font-semibold text-slate-400">
              Tagline: <span className="text-saffron">"See Heritage. Hear Its Story. Speak Its Language."</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-heritage">
              Navigation
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li>
                <button onClick={() => onNavigate('hero')} className="hover:text-gold transition-colors">
                  Home
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explorer')} className="hover:text-gold transition-colors">
                  Explore Heritage
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('how-it-works')} className="hover:text-gold transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('gallery')} className="hover:text-gold transition-colors">
                  Heritage Gallery
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('impact')} className="hover:text-gold transition-colors">
                  Social Impact
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('responsible-ai')} className="hover:text-gold transition-colors">
                  AI You Can Trust
                </button>
              </li>
            </ul>
          </div>

          {/* Languages & Heritage Areas */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-heritage">
              Languages
            </h4>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="text-gold font-semibold">தமிழ் (Tamil)</li>
              <li className="text-gold font-semibold">हिंदी (Hindi)</li>
              <li>English</li>
              <li className="text-slate-400">मराठी (Marathi)</li>
              <li className="text-slate-400">বাংলা (Bengali)</li>
              <li className="text-slate-400">తెలుగు (Telugu)</li>
            </ul>
          </div>

          {/* Hackathon Credentials */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-sm font-bold uppercase tracking-wider text-white font-heritage">
              Project
            </h4>
            <div className="space-y-2 text-xs text-slate-300">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gold/15 text-gold border border-gold/30 font-semibold">
                Hackathon Prototype
              </div>
              <p className="text-[11px] text-slate-400">
                Built with React, Tailwind CSS, Framer Motion, and Web Audio/Speech API.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors flex items-center justify-center"
                  aria-label="GitHub Repository"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 VirasatAI Platform. Honoring the timeless heritage of Bharat.</p>
          <div className="flex items-center gap-1 text-slate-400">
            <span>Crafted with</span>
            <Heart className="w-3.5 h-3.5 text-saffron fill-current" />
            <span>for Indian Cultural Preservation</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
