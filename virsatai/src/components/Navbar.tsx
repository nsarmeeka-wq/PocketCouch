import React, { useState } from 'react';
import { 
  Sparkles, 
  Volume2, 
  VolumeX, 
  Eye, 
  Type, 
  Compass, 
  Menu, 
  X, 
  Layers, 
  Languages, 
  PlaySquare
} from 'lucide-react';
import { audioService } from '../utils/audioNarration';

interface NavbarProps {
  onNavigate: (sectionId: string) => void;
  onOpenDemo: (id: string) => void;
  onToggleHighContrast: () => void;
  isHighContrast: boolean;
  onToggleLargeText: () => void;
  isLargeText: boolean;
  currentSection: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onNavigate,
  onOpenDemo,
  onToggleHighContrast,
  isHighContrast,
  onToggleLargeText,
  isLargeText,
  currentSection,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDroneOn, setIsDroneOn] = useState(false);

  const handleToggleDrone = () => {
    const newState = audioService.toggleAmbientDrone();
    setIsDroneOn(newState);
  };

  const navLinks = [
    { id: 'hero', label: 'Home' },
    { id: 'explorer', label: 'Explore Heritage' },
    { id: 'how-it-works', label: 'How It Works' },
    { id: 'gallery', label: 'Heritage Gallery' },
    { id: 'impact', label: 'Impact' },
    { id: 'responsible-ai', label: 'AI You Can Trust' },
  ];

  return (
    <nav className="sticky top-0 z-50 glass-nav transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo */}
          <div 
            onClick={() => onNavigate('hero')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="relative w-11 h-11 rounded-full bg-gradient-to-tr from-saffron to-gold flex items-center justify-center shadow-lg shadow-saffron/20 group-hover:scale-105 transition-transform">
              <div className="absolute inset-0.5 rounded-full bg-royal-800 flex items-center justify-center">
                <span className="text-xl">🪷</span>
              </div>
              <Sparkles className="w-3.5 h-3.5 text-gold absolute -top-0.5 -right-0.5 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-2xl font-bold font-heritage tracking-wide text-white">
                  Virasat<span className="text-saffron">AI</span>
                </span>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-gold/15 text-gold border border-gold/30">
                  India
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-sans tracking-wide">
                Make Indian Heritage Speak
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => onNavigate(link.id)}
                className={`px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  currentSection === link.id
                    ? 'text-gold bg-gold/10 border border-gold/30 shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/40'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Action & Accessibility Controls */}
          <div className="hidden sm:flex items-center gap-2.5">
            {/* Ambient Sound Drone Toggle */}
            <button
              onClick={handleToggleDrone}
              title={isDroneOn ? 'Silence Ambient Tanpura Drone' : 'Play Serene Classical Tanpura Drone'}
              aria-label="Ambient sound toggle"
              className={`p-2 rounded-lg transition-all border ${
                isDroneOn 
                  ? 'bg-saffron/20 border-saffron text-saffron shadow-sm shadow-saffron/30' 
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              {isDroneOn ? <Volume2 className="w-4 h-4 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* High Contrast Toggle */}
            <button
              onClick={onToggleHighContrast}
              title="Toggle High Contrast Mode for Accessibility"
              aria-label="High contrast mode"
              className={`p-2 rounded-lg transition-all border ${
                isHighContrast
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Eye className="w-4 h-4" />
            </button>

            {/* Large Text Toggle */}
            <button
              onClick={onToggleLargeText}
              title="Toggle Large Text Mode"
              aria-label="Large text mode"
              className={`p-2 rounded-lg transition-all border ${
                isLargeText
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Type className="w-4 h-4" />
            </button>

            {/* Hackathon Demo Quick Trigger */}
            <button
              onClick={() => onOpenDemo('konark_wheel')}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-400/40 flex items-center gap-1.5 shadow-sm transition-all"
            >
              <PlaySquare className="w-3.5 h-3.5 text-amber-400" />
              Demo Mode
            </button>

            {/* Primary CTA */}
            <button
              onClick={() => onNavigate('explorer')}
              className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 shadow-lg shadow-saffron/25 transition-all flex items-center gap-2 transform active:scale-95"
            >
              <Compass className="w-4 h-4" />
              Try VirasatAI
            </button>
          </div>

          {/* Mobile Hamburger Button */}
          <div className="flex sm:hidden items-center gap-2">
            <button
              onClick={() => onOpenDemo('konark_wheel')}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-gold/15 text-gold border border-gold/30"
            >
              Demo
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg text-slate-300 hover:text-white bg-slate-800/70 border border-slate-700"
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-royal-900/95 backdrop-blur-xl px-4 py-6 space-y-4">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => {
                  onNavigate(link.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`text-left px-4 py-2.5 rounded-lg text-base font-medium ${
                  currentSection === link.id
                    ? 'text-gold bg-gold/10 border border-gold/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                {link.label}
              </button>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleDrone}
                className={`p-2.5 rounded-lg border ${
                  isDroneOn ? 'bg-saffron/20 border-saffron text-saffron' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {isDroneOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
              <button
                onClick={onToggleHighContrast}
                className={`p-2.5 rounded-lg border ${
                  isHighContrast ? 'bg-gold/20 border-gold text-gold' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={onToggleLargeText}
                className={`p-2.5 rounded-lg border ${
                  isLargeText ? 'bg-gold/20 border-gold text-gold' : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Type className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                onNavigate('explorer');
                setIsMobileMenuOpen(false);
              }}
              className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-saffron to-gold text-slate-950 shadow-md"
            >
              Try VirasatAI
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};
