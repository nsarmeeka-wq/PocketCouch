import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Globe, Accessibility, HeartHandshake, Sparkles } from 'lucide-react';

export const ImpactSection: React.FC = () => {
  const impacts = [
    {
      icon: GraduationCap,
      emoji: '🎓',
      title: 'Education',
      description: 'Help students learn about Indian culture interactively through verified facts, quizzes, and multimedia.',
      color: 'from-amber-500/20 to-saffron/20',
      borderColor: 'border-saffron/40',
      badge: 'Interactive Learning',
    },
    {
      icon: Globe,
      emoji: '🌍',
      title: 'Tourism',
      description: 'Help tourists understand heritage sites in their preferred language without expensive guides or language barriers.',
      color: 'from-blue-500/20 to-royal-600/20',
      borderColor: 'border-blue-400/40',
      badge: 'Multilingual Bridge',
    },
    {
      icon: Accessibility,
      emoji: '♿',
      title: 'Accessibility',
      description: 'Make cultural knowledge accessible through native voice narration, high contrast, and simple descriptive language.',
      color: 'from-emerald-500/20 to-teal-600/20',
      borderColor: 'border-emerald-400/40',
      badge: 'Universal Access',
    },
    {
      icon: HeartHandshake,
      emoji: '🇮🇳',
      title: 'Cultural Preservation',
      description: 'Preserve and promote India’s cultural heritage for future generations by digitizing folklore and traditional craft knowledge.',
      color: 'from-purple-500/20 to-pink-600/20',
      borderColor: 'border-purple-400/40',
      badge: 'Living Heritage',
    },
  ];

  return (
    <section id="impact" className="py-20 lg:py-28 relative bg-royal-950/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-saffron/15 border border-saffron/30 text-saffron text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Social & Cultural Impact
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-heritage text-white">
            Why <span className="text-gold-gradient">VirasatAI</span> Matters
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            Bridging India’s 5,000-year civilizational heritage with 21st-century artificial intelligence.
          </p>
        </div>

        {/* 4 Impact Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {impacts.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`rounded-3xl p-6 glass-card border ${item.borderColor} flex flex-col justify-between group hover:-translate-y-2 transition-transform duration-300 shadow-xl`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-14 h-14 rounded-2xl bg-royal-800 border border-gold/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
                      <span>{item.emoji}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-slate-800/80 text-slate-300 border border-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold font-heritage text-white mb-2">
                    {item.title}
                  </h3>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-gold">
                  <span className="font-semibold">Virasat Impact Pillar</span>
                  <span className="font-mono">0{index + 1}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
