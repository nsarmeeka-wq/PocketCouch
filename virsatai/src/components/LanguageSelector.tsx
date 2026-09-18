import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Languages, Check, Sparkles, Globe } from 'lucide-react';
import { LanguageCode } from '../types/heritage';

interface LanguageSelectorProps {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  isTranslating: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  currentLanguage,
  onSelectLanguage,
  isTranslating,
}) => {
  const languages: Array<{
    code: LanguageCode;
    name: string;
    nativeName: string;
    scriptSample: string;
    badge: string;
  }> = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      scriptSample: 'Ancient Indian Architectural Brilliance',
      badge: 'Global',
    },
    {
      code: 'ta',
      name: 'Tamil',
      nativeName: 'தமிழ்',
      scriptSample: 'பண்டைய இந்தியாவின் கட்டிடக்கலை சிறப்பு',
      badge: 'Full Native',
    },
    {
      code: 'hi',
      name: 'Hindi',
      nativeName: 'हिंदी',
      scriptSample: 'प्राचीन भारत की वास्तुकला की उत्कृष्टता',
      badge: 'Full Native',
    },
    {
      code: 'mr',
      name: 'Marathi',
      nativeName: 'मराठी',
      scriptSample: 'प्राचीन भारताचा सांस्कृतिक व वास्तू वारसा',
      badge: 'Preview',
    },
    {
      code: 'bn',
      name: 'Bengali',
      nativeName: 'বাংলা',
      scriptSample: 'প্রাচীন ভারতের অনুপম স্থাপত্য ভাস্কর্য',
      badge: 'Preview',
    },
    {
      code: 'te',
      name: 'Telugu',
      nativeName: 'తెలుగు',
      scriptSample: 'ప్రాచీన భారతీయ శిల్పకళా వైభవం',
      badge: 'Preview',
    },
  ];

  return (
    <div className="p-6 sm:p-8 rounded-3xl glass-card border border-gold/30 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
            <Languages className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xl font-bold font-heritage text-white flex items-center gap-2">
              Experience Heritage in Your Language
              {isTranslating && (
                <span className="inline-flex items-center text-xs text-saffron font-sans font-medium animate-pulse">
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Translating...
                </span>
              )}
            </h3>
            <p className="text-xs sm:text-sm text-slate-400">
              Select your preferred Indian language for facts, story, and voice narration
            </p>
          </div>
        </div>

        <span className="self-start sm:self-auto px-3 py-1 text-xs font-semibold rounded-full bg-slate-800 text-gold border border-gold/30 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5" />
          Bilingual Tamil & Hindi Active
        </span>
      </div>

      {/* Language Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {languages.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <button
              key={lang.code}
              onClick={() => onSelectLanguage(lang.code)}
              className={`relative p-3.5 rounded-2xl text-left transition-all duration-200 border flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-royal-700 to-royal-800 border-gold shadow-lg shadow-gold/15'
                  : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {/* Badge & Check */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {lang.badge}
                </span>
                {isSelected && (
                  <span className="w-4 h-4 rounded-full bg-gold text-slate-950 flex items-center justify-center">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>

              {/* Language Name */}
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  {lang.name}
                </p>
                <p className="text-base font-bold text-gold font-heritage mt-0.5">
                  {lang.nativeName}
                </p>
              </div>

              {/* Native Script Sample */}
              <p className="text-[11px] text-slate-400 mt-2 truncate font-sans">
                {lang.scriptSample}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
};
