import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle2, 
  AlertTriangle, 
  MapPin, 
  Calendar, 
  Compass, 
  BookOpen, 
  Palette, 
  Columns3, 
  Sparkles, 
  ChevronDown, 
  ChevronUp, 
  ShieldCheck, 
  Share2, 
  Bookmark,
  Scroll,
  HelpCircle
} from 'lucide-react';
import { HeritageItem, LanguageCode, ScanResult } from '../types/heritage';
import { LanguageSelector } from './LanguageSelector';
import { AudioPlayer } from './AudioPlayer';

interface HeritageResultProps {
  scanResult: ScanResult;
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onOpenStory: () => void;
  onScrollToQuiz: () => void;
}

export const HeritageResult: React.FC<HeritageResultProps> = ({
  scanResult,
  currentLanguage,
  onSelectLanguage,
  onOpenStory,
  onScrollToQuiz,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'architecture' | 'facts'>('overview');
  const [expandedSections, setExpandedSections] = useState({
    history: true,
    culturalSignificance: true,
    architecture: true,
    facts: true,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // If low confidence / unverified scan result
  if (!scanResult.identified || !scanResult.item) {
    return (
      <section className="py-12 px-4 max-w-4xl mx-auto">
        <div className="p-8 rounded-3xl bg-amber-950/40 border-2 border-amber-500/50 backdrop-blur-xl text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
            <AlertTriangle className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-900/60 text-amber-300 border border-amber-500/40">
              Low Confidence Match ({scanResult.confidence}%)
            </span>
            <h3 className="text-2xl font-bold font-heritage text-white">
              We are not fully certain about this heritage object.
            </h3>
            <p className="text-slate-300 max-w-lg mx-auto text-sm">
              Please verify the information with a cultural expert or archaeological authority.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-left max-w-md mx-auto space-y-2 text-xs text-slate-300">
            <p className="font-semibold text-amber-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Responsible AI Transparency Protocol:
            </p>
            <p>• Visual edge contours do not match indexed national monument profiles.</p>
            <p>• Knowledge base guardrail prevents generating ungrounded historical claims.</p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 rounded-xl font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg transition-all"
          >
            Try Another Heritage Artifact
          </button>
        </div>
      </section>
    );
  }

  const item = scanResult.item;
  const name = item.names[currentLanguage] || item.name;
  const location = item.locations[currentLanguage] || item.location;
  const overview = item.overview[currentLanguage] || item.overview.en;
  const culturalSignificance = item.culturalSignificance[currentLanguage] || item.culturalSignificance.en;
  const history = item.history[currentLanguage] || item.history.en;
  const architecture = item.architecture[currentLanguage] || item.architecture.en;
  const facts = item.facts[currentLanguage] || item.facts.en || [];
  const audioText = item.audioNarrationText[currentLanguage] || item.audioNarrationText.en || overview;

  return (
    <section id="result-dashboard" className="py-12 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Multilingual Selector Header */}
        <LanguageSelector
          currentLanguage={currentLanguage}
          onSelectLanguage={onSelectLanguage}
          isTranslating={false}
        />

        {/* Main Results Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT SIDE: Scanned Image, Confidence & Recognition Metadata */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="rounded-3xl overflow-hidden glass-card border border-gold/30 shadow-2xl relative group">
              {/* Main Image */}
              <div className="relative aspect-[4/3] w-full overflow-hidden">
                <img
                  src={item.imageUrl}
                  alt={name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                
                {/* AI Scan Complete Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-emerald-500/50 text-emerald-400 text-xs font-bold shadow-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  AI Scan Complete ✓
                </div>

                {/* Confidence Badge */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/85 backdrop-blur-md border border-gold/50 text-gold text-xs font-bold shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  {scanResult.confidence}% Match
                </div>

                {/* Bottom Overlay Category */}
                <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-xs text-slate-200">
                  <span className="px-2.5 py-1 rounded-lg bg-royal-900/90 backdrop-blur-md border border-slate-700 font-medium">
                    {item.category}
                  </span>
                  {item.unescoStatus && (
                    <span className="px-2.5 py-1 rounded-lg bg-royal-900/90 backdrop-blur-md border border-gold/30 text-gold font-medium">
                      UNESCO Heritage
                    </span>
                  )}
                </div>
              </div>

              {/* Scanned Attribute Badges */}
              <div className="p-5 space-y-3 bg-royal-900/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Detection Model:</span>
                  <span className="text-white font-semibold">Virasat-Vision v2.4</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">State / Origin:</span>
                  <span className="text-gold font-semibold">{item.state}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 font-medium">Arch. Style:</span>
                  <span className="text-white font-semibold">{item.tags[0] || 'Classical'}</span>
                </div>

                {/* Verified Knowledge Badge */}
                <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>✓ Verified Heritage Information</span>
                </div>
              </div>
            </div>

            {/* Audio Narration Component */}
            <AudioPlayer
              narrationText={audioText}
              language={currentLanguage}
              heritageName={name}
            />

            {/* Story & Quiz Quick Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onOpenStory}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-saffron to-gold text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-saffron/20 hover:brightness-110 active:scale-95 transition-all"
              >
                <Scroll className="w-4 h-4" />
                Tell Me a Story
              </button>

              <button
                onClick={onScrollToQuiz}
                className="p-3.5 rounded-2xl bg-royal-800 hover:bg-royal-700 text-gold font-bold text-xs sm:text-sm border border-gold/40 flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <HelpCircle className="w-4 h-4" />
                Heritage Quiz
              </button>
            </div>

          </div>

          {/* RIGHT SIDE: Heritage Title, Location, Period, Expandable Cultural Sections */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Header Title Card */}
            <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase font-bold tracking-widest text-saffron flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-saffron animate-pulse" />
                  Heritage Identified
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/40">
                  Verified Fact Base
                </span>
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold font-heritage text-white">
                {name}
              </h2>

              {/* Badges Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
                  <MapPin className="w-4 h-4 text-saffron shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Location</p>
                    <p className="text-xs font-semibold text-white truncate">{location}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-gold shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Historical Period</p>
                    <p className="text-xs font-semibold text-white truncate">{item.period}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div className="overflow-hidden">
                    <p className="text-[10px] uppercase text-slate-400 font-bold">Category</p>
                    <p className="text-xs font-semibold text-white truncate">{item.category}</p>
                  </div>
                </div>
              </div>

              {/* Main Overview Paragraph */}
              <div className="pt-2 border-t border-slate-800/80">
                <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
                  {overview}
                </p>
              </div>
            </div>

            {/* Expandable Section 1: Cultural Significance */}
            <div className="rounded-2xl glass-card border border-gold/20 overflow-hidden">
              <button
                onClick={() => toggleSection('culturalSignificance')}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-saffron/15 border border-saffron/30 flex items-center justify-center text-saffron">
                    <Palette className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-heritage text-white">
                    🎨 Cultural Significance & Symbolism
                  </h3>
                </div>
                {expandedSections.culturalSignificance ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.culturalSignificance && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-slate-800/60"
                  >
                    <p className="text-slate-300 text-sm leading-relaxed pt-3">
                      {culturalSignificance}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Expandable Section 2: History & Origin */}
            <div className="rounded-2xl glass-card border border-gold/20 overflow-hidden">
              <button
                onClick={() => toggleSection('history')}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-heritage text-white">
                    📜 History & Royal Patronage
                  </h3>
                </div>
                {expandedSections.history ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.history && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-slate-800/60"
                  >
                    <p className="text-slate-300 text-sm leading-relaxed pt-3">
                      {history}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Expandable Section 3: Architecture & Technique */}
            <div className="rounded-2xl glass-card border border-gold/20 overflow-hidden">
              <button
                onClick={() => toggleSection('architecture')}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Columns3 className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-heritage text-white">
                    🏛 Architecture & Craftsmanship
                  </h3>
                </div>
                {expandedSections.architecture ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.architecture && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-slate-800/60"
                  >
                    <p className="text-slate-300 text-sm leading-relaxed pt-3">
                      {architecture}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Expandable Section 4: Interesting Facts */}
            <div className="rounded-2xl glass-card border border-gold/20 overflow-hidden">
              <button
                onClick={() => toggleSection('facts')}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold font-heritage text-white">
                    ✨ Interesting Verified Facts
                  </h3>
                </div>
                {expandedSections.facts ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedSections.facts && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="px-5 pb-5 border-t border-slate-800/60"
                  >
                    <ul className="space-y-2.5 pt-3">
                      {facts.map((fact, idx) => (
                        <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold mt-2 shrink-0" />
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};
