import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2, Headphones, Sparkles, Gauge } from 'lucide-react';
import { audioService } from '../utils/audioNarration';
import { LanguageCode } from '../types/heritage';

interface AudioPlayerProps {
  narrationText: string;
  language: LanguageCode;
  heritageName: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  narrationText,
  language,
  heritageName,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(0.95);

  const languageLabels: Record<LanguageCode, string> = {
    en: 'English',
    ta: 'தமிழ் (Tamil)',
    hi: 'हिंदी (Hindi)',
    mr: 'मराठी (Marathi)',
    bn: 'বাংলা (Bengali)',
    te: 'తెలుగు (Telugu)',
  };

  const [isPaused, setIsPaused] = useState(false);

  // Effect to restart speech when text or language changes
  useEffect(() => {
    const wasPlaying = isPlaying;
    const wasPaused = isPaused;
    audioService.stop();
    setIsPlaying(false);
    setIsPaused(false);
    if (wasPlaying) {
      audioService.speak(narrationText, language, {
        rate: playbackRate,
        onStart: () => setIsPlaying(true),
        onEnd: () => setIsPlaying(false),
        onError: () => setIsPlaying(false),
      });
    } else if (wasPaused) {
      // If it was paused, keep it paused after language change
      // No action needed as speech is stopped
    }
  }, [narrationText, language]);

  const handlePlay = () => {
    if (isPlaying) {
      audioService.pause();
      setIsPlaying(false);
      setIsPaused(true);
    } else {
      if (isPaused && audioService.isPaused()) {
        audioService.resume();
        setIsPlaying(true);
        setIsPaused(false);
      } else {
        audioService.speak(narrationText, language, {
          rate: playbackRate,
          onStart: () => setIsPlaying(true),
          onEnd: () => setIsPlaying(false),
          onError: () => setIsPlaying(false),
        });
      }
    }
  };


  const handleReplay = () => {
    audioService.stop();
    audioService.speak(narrationText, language, {
      rate: playbackRate,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const toggleRate = () => {
    const nextRate = playbackRate === 0.95 ? 1.15 : playbackRate === 1.15 ? 0.85 : 0.95;
    setPlaybackRate(nextRate);
    if (isPlaying) {
      handleReplay();
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-royal-800/80 border border-gold/30 shadow-lg space-y-4">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-saffron/20 border border-saffron/40 flex items-center justify-center text-saffron">
            <Volume2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold font-heritage text-white">
              🔊 Listen to Heritage Audio Guide
            </h4>
            <p className="text-xs text-gold">
              Listen in {languageLabels[language] || 'English'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed Toggle */}
          <button
            onClick={toggleRate}
            className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-300 hover:text-white flex items-center gap-1"
            title="Adjust Speech Speed"
          >
            <Gauge className="w-3 h-3 text-gold" />
            {playbackRate}x
          </button>

          <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 border border-emerald-500/40 text-emerald-400">
            TTS Active
          </span>
        </div>
      </div>

      {/* Center Controls & Audio Waves */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Buttons: Play/Pause/Replay */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePlay}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 shadow-md shadow-saffron/20 transition-all flex items-center gap-2 active:scale-95"
          >
            {isPlaying ? (
              <>
                <Pause className="w-4 h-4 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <button
            onClick={handleReplay}
            className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700 transition-colors"
            title="Replay from start"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Voice Wave Animation */}
        <div className="flex-1 max-w-xs flex items-center justify-end gap-1 px-3 py-2 rounded-xl bg-slate-950/60 border border-slate-800">
          <span className="text-[11px] text-slate-400 mr-2">
            {isPlaying ? 'Speaking...' : 'Ready'}
          </span>
          {[4, 12, 8, 16, 22, 14, 28, 18, 10, 24, 14, 8, 18, 6].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-200 ${
                isPlaying
                  ? 'bg-gradient-to-t from-saffron to-gold animate-pulse'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(4, (h * Math.sin(i + 1) * 0.5 + h))}px` : '4px',
                animationDelay: `${i * 0.08}s`,
              }}
            />
          ))}
        </div>

      </div>

      {/* Narration Preview snippet */}
      <p className="text-xs text-slate-300 italic line-clamp-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/80">
        "{narrationText}"
      </p>

    </div>
  );
};
