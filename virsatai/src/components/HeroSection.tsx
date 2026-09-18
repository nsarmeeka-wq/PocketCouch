import React from 'react';
import { motion } from 'framer-motion';
import { Compass, Info, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';

interface HeroSectionProps {
  onExploreClick: () => void;
  onHowItWorksClick: () => void;
  onOpenDemo: (id: string) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onExploreClick,
  onHowItWorksClick,
  onOpenDemo,
}) => {
  const floatingBadges = [
    { icon: '📸', label: 'Image Vision', delay: 0.1, position: 'top-10 -left-6 sm:-left-10' },
    { icon: '🤖', label: 'AI Neural Rec', delay: 0.3, position: 'top-6 -right-4 sm:-right-8' },
    { icon: '🗣', label: '10+ Languages', delay: 0.5, position: 'bottom-20 -left-4 sm:-left-12' },
    { icon: '🔊', label: 'Voice Narration', delay: 0.7, position: 'bottom-12 -right-4 sm:-right-10' },
    { icon: '🧠', label: 'Heritage Quiz', delay: 0.9, position: '-top-6 left-1/2 -translate-x-1/2' },
  ];

  return (
    <section className="relative pt-12 pb-24 lg:pt-20 lg:pb-32 overflow-hidden">
      {/* Background Decorative Mandala Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-gradient-to-br from-saffron/15 via-gold/10 to-royal-600/0 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 w-72 h-72 bg-saffron/10 rounded-full blur-2xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-gold/10 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Heading, Subheading, CTAs */}
          <div className="lg:col-span-7 text-center lg:text-left space-y-7">
            
            {/* Tagline Badge */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-slate-900/80 border border-gold/30 text-gold text-xs font-semibold uppercase tracking-widest shadow-inner shadow-gold/10"
            >
              <Sparkles className="w-3.5 h-3.5 text-gold animate-spin-slow" />
              <span>See Heritage • Hear Its Story • Speak Its Language</span>
            </motion.div>

            {/* Main Headline */}
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-4xl sm:text-6xl xl:text-7xl font-bold font-heritage tracking-tight leading-[1.1]"
            >
              Make Indian Heritage{' '}
              <span className="text-saffron-gradient underline decoration-gold/40 decoration-wavy decoration-2">
                Speak
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl sm:text-2xl font-medium text-gold-warm"
            >
              Discover India's cultural treasures through AI, language, and storytelling.
            </motion.p>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto lg:mx-0"
            >
              Upload an image of a monument, artwork, sculpture, textile, or cultural object and let VirasatAI identify it, explain its history, translate it into your language, and bring it to life through voice.
            </motion.p>

            {/* Action Buttons */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2"
            >
              <button
                onClick={onExploreClick}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-base bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 shadow-xl shadow-saffron/25 transition-all flex items-center justify-center gap-3 transform active:scale-95 group"
              >
                <Compass className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                Explore Heritage
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onHowItWorksClick}
                className="w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-base bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 hover:border-gold/50 shadow-md transition-all flex items-center justify-center gap-2.5"
              >
                <Info className="w-5 h-5 text-gold" />
                How It Works
              </button>
            </motion.div>

            {/* Trust and Provenance Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="pt-3 flex items-center justify-center lg:justify-start gap-3 text-xs text-slate-400"
            >
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-4 h-4" />
                <span>Verified Knowledge Engine</span>
              </div>
              <span>•</span>
              <span>Zero AI Hallucinations</span>
              <span>•</span>
              <span>Tamil & Hindi Native</span>
            </motion.div>

          </div>

          {/* Right Column: Dynamic Cultural & AI Composite Animation */}
          <div className="lg:col-span-5 relative flex justify-center items-center">
            
            <div className="relative w-full max-w-[420px] aspect-square flex items-center justify-center">
              
              {/* Outer Rotating Sacred Mandala Ring */}
              <div className="absolute inset-0 rounded-full border border-dashed border-gold/30 animate-spin-slow" />
              <div className="absolute inset-6 rounded-full border border-saffron/20 animate-pulse-slow" />

              {/* Central Glassmorphic Portal Showcase */}
              <motion.div 
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-3xl overflow-hidden glass-card p-3 shadow-2xl shadow-saffron/20 border-2 border-gold/30"
              >
                {/* Visual Image with Heritage Accent */}
                <div className="relative w-full h-full rounded-2xl overflow-hidden group">
                  <img
                    src="https://images.unsplash.com/photo-1609766857041-ed402ea8069a?q=80&w=800&auto=format&fit=crop"
                    alt="Konark Sun Temple Wheel"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  
                  {/* Cyber-Cultural Neural Grid Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-royal-900 via-royal-900/30 to-transparent" />

                  {/* Animated Laser Scanning Line */}
                  <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent shadow-lg shadow-gold animate-scan-laser pointer-events-none" />

                  {/* Recognition HUD Tag */}
                  <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-xl bg-royal-900/90 backdrop-blur-md border border-gold/40 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-gold tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                        AI Recognition 96%
                      </p>
                      <h4 className="text-sm font-bold text-white font-heritage truncate">Konark Sun Temple Wheel</h4>
                      <p className="text-[10px] text-slate-300">Odisha • 13th Century CE</p>
                    </div>
                    <button
                      onClick={() => onOpenDemo('konark_wheel')}
                      className="px-2.5 py-1.5 rounded-lg bg-saffron text-slate-950 font-bold text-xs hover:bg-gold transition-colors shrink-0"
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              </motion.div>

              {/* Floating Animated Cultural Badges */}
              {floatingBadges.map((badge, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: badge.delay }}
                  className={`absolute ${badge.position} z-20 animate-float`}
                  style={{ animationDelay: `${idx * 0.8}s` }}
                >
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-gold/40 shadow-lg text-xs font-semibold text-white whitespace-nowrap">
                    <span className="text-base">{badge.icon}</span>
                    <span>{badge.label}</span>
                  </div>
                </motion.div>
              ))}

              {/* Indian Languages Audio Waves Symbolism */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-2 rounded-full glass-card border border-gold/30">
                <span className="text-xs text-gold font-semibold">தமிழ்</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-gold font-semibold">हिंदी</span>
                <span className="text-slate-500">•</span>
                <span className="text-xs text-gold font-semibold">English</span>
                <div className="flex items-center gap-0.5 ml-2">
                  <span className="w-1 h-3 bg-saffron rounded-full animate-pulse" />
                  <span className="w-1 h-5 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1 h-2 bg-saffron rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                  <span className="w-1 h-4 bg-gold rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                </div>
              </div>

            </div>

          </div>

        </div>
      </div>
    </section>
  );
};
