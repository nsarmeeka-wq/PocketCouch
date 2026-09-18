import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle2, AlertOctagon, Cpu, Eye, FileCheck, Sparkles } from 'lucide-react';

export const ResponsibleAI: React.FC = () => {
  const trustPillars = [
    {
      icon: ShieldCheck,
      title: '✓ Verified Knowledge Base',
      detail: 'Every fact, date, dynasty, and religious symbolism is tied directly to verified archaeological and academic records (ASI, UNESCO, ICOMOS).',
    },
    {
      icon: Cpu,
      title: '✓ Confidence Detection',
      detail: 'Multi-layer contour analysis estimates match probability from 0% to 100%, never presenting speculative guesses as historical truth.',
    },
    {
      icon: AlertOctagon,
      title: '✓ Low Confidence Warning',
      detail: 'When artifacts are unclear or unverified, VirasatAI explicitly halts claims and advises consulting human cultural experts.',
    },
    {
      icon: FileCheck,
      title: '✓ Transparent AI Results',
      detail: 'Zero hallucinated folklore. Clear distinction between recognized archaeological artifacts and generated artistic narrations.',
    },
  ];

  return (
    <section id="responsible-ai" className="py-20 lg:py-28 relative border-t border-gold/15 bg-royal-950/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            Ethical & Responsible Artificial Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-heritage text-white">
            AI You Can <span className="text-emerald-400">Trust</span>
          </h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            VirasatAI combines AI recognition with verified cultural knowledge to reduce misinformation and protect historical accuracy.
          </p>
        </div>

        {/* 4 Trust Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className="p-6 rounded-3xl glass-card border border-emerald-500/30 flex flex-col justify-between hover:border-emerald-400 transition-all shadow-xl"
              >
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                    <Icon className="w-6 h-6" />
                  </div>

                  <h3 className="text-base font-bold text-white font-heritage">
                    {pillar.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {pillar.detail}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800 text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
                  Responsible AI Protocol
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Quote / Commitment Callout */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-royal-900 via-royal-800 to-royal-900 border border-gold/30 text-center max-w-4xl mx-auto shadow-2xl space-y-3">
          <p className="text-sm sm:text-base font-medium text-slate-200 leading-relaxed font-serif italic">
            "Cultural heritage represents the sacred memory of civilizations. VirasatAI adheres to the principle that AI must never invent ancient history, but rather illuminate verified truths in every Indian tongue."
          </p>
          <p className="text-xs uppercase font-bold tracking-widest text-gold">
            VirasatAI Heritage Ethics Charter
          </p>
        </div>

      </div>
    </section>
  );
};
