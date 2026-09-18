import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Award, 
  RotateCcw, 
  ArrowRight, 
  Sparkles,
  Trophy
} from 'lucide-react';
import { LanguageCode, QuizQuestion } from '../types/heritage';

interface HeritageQuizProps {
  questions: QuizQuestion[];
  currentLanguage: LanguageCode;
  heritageName: string;
  onExploreAnother: () => void;
}

export const HeritageQuiz: React.FC<HeritageQuizProps> = ({
  questions,
  currentLanguage,
  heritageName,
  onExploreAnother,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const currentQ = questions[currentIndex];
  if (!currentQ) return null;

  const questionText = currentQ.question[currentLanguage] || currentQ.question.en;
  const options = currentQ.options[currentLanguage] || currentQ.options.en;
  const explanation = currentQ.explanation[currentLanguage] || currentQ.explanation.en;

  const handleSelectOption = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setIsAnswered(true);

    const isCorrect = index === currentQ.correctIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      confetti({
        particleCount: 40,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#FF6B35', '#FFB703', '#10B981'],
      });
    }
  };

  const handleNext = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setIsComplete(true);
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#FF6B35', '#FFB703', '#FBBF24', '#059669'],
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setIsComplete(false);
  };

  return (
    <section id="heritage-quiz" className="py-16 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Quiz Card Container */}
        <div className="rounded-3xl glass-card border border-gold/30 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          
          {/* Header Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/40 flex items-center justify-center text-gold">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-2xl font-bold font-heritage text-white">
                  Test Your Heritage Knowledge
                </h3>
                <p className="text-xs text-gold">
                  Based on {heritageName}
                </p>
              </div>
            </div>

            {!isComplete && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-400">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-royal-800 border border-gold/30 text-gold">
                  Score: {score}
                </span>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {!isComplete && (
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-8">
              <div
                className="h-full bg-gradient-to-r from-saffron to-gold transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          )}

          {/* Quiz Completion Screen */}
          {isComplete ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8 space-y-6"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-saffron to-gold flex items-center justify-center mx-auto text-slate-950 shadow-xl shadow-saffron/20">
                <Trophy className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-2">
                <h4 className="text-3xl font-bold font-heritage text-white">
                  🎉 Great Job!
                </h4>
                <p className="text-xl font-bold text-gold">
                  You scored {score} / {questions.length}
                </p>
                <p className="text-sm text-slate-300 max-w-md mx-auto">
                  {score === questions.length
                    ? 'Outstanding! You have mastered the cultural facts of this Indian treasure.'
                    : 'Good attempt! Every step helps preserve India’s cultural heritage.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
                <button
                  onClick={handleRestart}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-2 transition-all"
                >
                  <RotateCcw className="w-4 h-4" />
                  Retry Quiz
                </button>

                <button
                  onClick={onExploreAnother}
                  className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 shadow-lg shadow-saffron/20 flex items-center gap-2 transition-all"
                >
                  <span>Explore Another Heritage Story</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* Active Question State */
            <div className="space-y-6">
              
              {/* Question Label */}
              <div className="space-y-2">
                <span className="text-xs uppercase font-bold tracking-widest text-saffron">
                  Question {currentIndex + 1}
                </span>
                <h4 className="text-lg sm:text-xl font-bold text-white leading-snug">
                  {questionText}
                </h4>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {options.map((opt, idx) => {
                  const isSelected = selectedOption === idx;
                  const isCorrect = idx === currentQ.correctIndex;

                  let cardStyle = 'bg-slate-900/70 border-slate-800 hover:border-slate-600 text-slate-200';
                  if (isAnswered) {
                    if (isCorrect) {
                      cardStyle = 'bg-emerald-950/70 border-emerald-500 text-white font-semibold shadow-lg shadow-emerald-500/15';
                    } else if (isSelected && !isCorrect) {
                      cardStyle = 'bg-rose-950/70 border-rose-500 text-white font-semibold shadow-lg shadow-rose-500/15';
                    } else {
                      cardStyle = 'bg-slate-900/40 border-slate-800/60 opacity-50 text-slate-400';
                    }
                  } else if (isSelected) {
                    cardStyle = 'bg-royal-700 border-gold text-white';
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectOption(idx)}
                      disabled={isAnswered}
                      className={`p-4 rounded-2xl border text-left transition-all duration-200 flex items-center justify-between gap-3 ${cardStyle}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-sm font-medium leading-tight">
                          {opt}
                        </span>
                      </div>

                      {isAnswered && isCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      )}
                      {isAnswered && isSelected && !isCorrect && (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Feedback Explanation */}
              <AnimatePresence>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-royal-900/90 border border-gold/30 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gold uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Archaeological Verification Note:
                      </p>
                      <span className={`text-xs font-bold ${selectedOption === currentQ.correctIndex ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {selectedOption === currentQ.correctIndex ? 'Correct Answer!' : 'Incorrect'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {explanation}
                    </p>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleNext}
                        className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 flex items-center gap-2 shadow-md transition-all"
                      >
                        <span>{currentIndex + 1 === questions.length ? 'Show Results' : 'Next Question'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          )}

        </div>

      </div>
    </section>
  );
};
