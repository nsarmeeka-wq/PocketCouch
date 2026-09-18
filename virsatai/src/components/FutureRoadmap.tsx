import React from 'react';
import { motion } from 'framer-motion';
import { Milestone, CheckCircle, Clock, Sparkles, Smartphone, Glasses, Compass, Users } from 'lucide-react';

export const FutureRoadmap: React.FC = () => {
  const phases = [
    {
      phase: 'Phase 1',
      title: 'AI Heritage Recognition',
      status: 'Active MVP',
      isCompleted: true,
      icon: Sparkles,
      desc: 'Computer vision image detection, verified knowledge base, native Tamil, Hindi & English translation, Web Speech audio guide, and interactive quizzes.',
    },
    {
      phase: 'Phase 2',
      title: 'All 22 Indian Languages',
      status: 'In Progress',
      isCompleted: false,
      icon: Milestone,
      desc: 'Expanding multilingual translation and voice synthesis to Marathi, Bengali, Telugu, Kannada, Malayalam, Odia, Gujarati, Punjabi, and Assamese.',
    },
    {
      phase: 'Phase 3',
      title: 'AR Museum Experience',
      status: 'Upcoming',
      isCompleted: false,
      icon: Smartphone,
      desc: 'Augmented Reality projection placing full-scale 3D stone chariots, bronze idols, and temple murals right in the user’s living room or classroom.',
    },
    {
      phase: 'Phase 4',
      title: 'Virtual Heritage Tours',
      status: 'Research',
      isCompleted: false,
      icon: Glasses,
      desc: 'Immersive WebXR 360-degree virtual tours with spatial audio, guided by AI avatars dressed in period-accurate historical attire.',
    },
    {
      phase: 'Phase 5',
      title: 'Community Cultural Contributions',
      status: 'Future Vision',
      isCompleted: false,
      icon: Users,
      desc: 'Crowdsourced repository empowering local village elders, master artisans, and folklorists to record vanishing oral traditions.',
    },
  ];

  return (
    <section id="roadmap" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
            <Milestone className="w-3.5 h-3.5" />
            Evolution & Vision
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-heritage text-white">
            Future <span className="text-gold-gradient">Roadmap</span>
          </h2>
          <p className="text-slate-300 text-sm sm:text-base">
            From an AI prototype to the premier digital sanctuary for Indian civilization.
          </p>
        </div>

        {/* Timeline Horizontal / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {phases.map((p, idx) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.phase}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.1 }}
                className={`rounded-3xl p-6 glass-card border flex flex-col justify-between ${
                  p.isCompleted ? 'border-emerald-500/50 bg-emerald-950/20' : 'border-gold/25'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-gold font-mono">
                      {p.phase}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.isCompleted
                          ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-royal-800 border border-slate-700 flex items-center justify-center text-gold">
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="text-base font-bold text-white font-heritage leading-tight">
                    {p.title}
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed">
                    {p.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
                  {p.isCompleted ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>{p.isCompleted ? 'Completed & Live' : 'Target Milestone'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
