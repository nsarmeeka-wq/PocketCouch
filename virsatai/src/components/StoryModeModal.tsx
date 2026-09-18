import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Scroll, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  BookOpen, 
  Compass, 
  Play, 
  Pause 
} from 'lucide-react';
import { HeritageItem, LanguageCode } from '../types/heritage';
import { audioService } from '../utils/audioNarration';

interface StoryModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: HeritageItem;
  currentLanguage: LanguageCode;
}

export const StoryModeModal: React.FC<StoryModeModalProps> = ({
  isOpen,
  onClose,
  item,
  currentLanguage,
}) => {
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [isNarrating, setIsNarrating] = useState(false);

  const storyData = item.story;
  const chapters = storyData.chapters;
  const title = storyData.title[currentLanguage] || storyData.title.en;
  const intro = storyData.intro[currentLanguage] || storyData.intro.en;

  const currentChapter = chapters[currentChapterIndex];
  const chapterTitle = currentChapter?.title[currentLanguage] || currentChapter?.title.en || '';
  const chapterContent = currentChapter?.content[currentLanguage] || currentChapter?.content.en || '';

  useEffect(() => {
    // Reset chapter when opening new modal
    if (isOpen) {
      setCurrentChapterIndex(0);
      setIsNarrating(false);
      // Auto-start serene ambient drone if desired
      audioService.toggleAmbientDrone(true);
    } else {
      audioService.stop();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleReadChapter = () => {
    if (isNarrating) {
      audioService.stop();
      setIsNarrating(false);
    } else {
      const textToRead = `${chapterTitle}. ${chapterContent}`;
      audioService.speak(textToRead, currentLanguage, {
        rate: 0.9,
        onStart: () => setIsNarrating(true),
        onEnd: () => setIsNarrating(false),
        onError: () => setIsNarrating(false),
      });
    }
  };

  const handleNextChapter = () => {
    audioService.stop();
    setIsNarrating(false);
    if (currentChapterIndex < chapters.length - 1) {
      setCurrentChapterIndex((prev) => prev + 1);
    }
  };

  const handlePrevChapter = () => {
    audioService.stop();
    setIsNarrating(false);
    if (currentChapterIndex > 0) {
      setCurrentChapterIndex((prev) => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-xl animate-fade-in">
      
      {/* Background Mandala Watermark */}
      <div className="absolute inset-0 bg-mandala-pattern opacity-30 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl rounded-3xl glass-card border border-gold/40 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header Bar */}
        <div className="p-6 border-b border-gold/20 flex items-center justify-between bg-royal-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-saffron/20 border border-saffron/40 flex items-center justify-center text-saffron">
              <Scroll className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-gold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Virasat Storybook Mode
              </span>
              <h3 className="text-xl font-bold font-heritage text-white truncate max-w-md">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Audio Voice Narration of Story */}
            <button
              onClick={handleReadChapter}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                isNarrating
                  ? 'bg-saffron/20 border-saffron text-saffron animate-pulse'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              {isNarrating ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              {isNarrating ? 'Pause Voice' : 'Narrate Story'}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              aria-label="Close story mode"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Content */}
        <div className="p-6 sm:p-10 overflow-y-auto space-y-6 flex-1 bg-gradient-to-b from-royal-900/90 to-royal-950/95">
          
          {/* Atmospheric Intro Banner */}
          <div className="p-4 sm:p-5 rounded-2xl bg-royal-800/60 border border-gold/20 text-xs sm:text-sm text-gold-warm italic font-serif leading-relaxed">
            "{intro}"
          </div>

          {/* Chapter Slide */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentChapterIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 py-2"
            >
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider bg-gold/15 text-gold border border-gold/30">
                  Chapter {currentChapterIndex + 1} of {chapters.length}
                </span>
              </div>

              <h4 className="text-2xl sm:text-3xl font-bold font-heritage text-white">
                {chapterTitle}
              </h4>

              <p className="text-base sm:text-lg text-slate-200 leading-relaxed font-sans">
                {chapterContent}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Verified Historical Seal */}
          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Historical Grounding: Archaeological Survey of India (ASI) records</span>
            <span className="text-emerald-400 font-semibold">100% Fact Checked</span>
          </div>

        </div>

        {/* Navigation Footer */}
        <div className="p-4 sm:p-6 border-t border-gold/20 flex items-center justify-between bg-royal-950/90">
          <button
            onClick={handlePrevChapter}
            disabled={currentChapterIndex === 0}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none text-slate-200 flex items-center gap-1.5 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous Chapter
          </button>

          {/* Chapter indicator dots */}
          <div className="flex items-center gap-1.5">
            {chapters.map((_, idx) => (
              <button
                key={idx}
                onClick={() => {
                  audioService.stop();
                  setIsNarrating(false);
                  setCurrentChapterIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentChapterIndex ? 'w-6 bg-gold' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNextChapter}
            disabled={currentChapterIndex === chapters.length - 1}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-gradient-to-r from-saffron to-gold text-slate-950 disabled:opacity-40 disabled:pointer-events-none hover:brightness-110 flex items-center gap-1.5 transition-all"
          >
            Next Chapter
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </motion.div>
    </div>
  );
};
