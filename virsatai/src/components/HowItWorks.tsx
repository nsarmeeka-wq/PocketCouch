import React from 'react';
import { motion } from 'framer-motion';
import { Camera, Cpu, BookOpen, Globe2, Headphones, ArrowRight, Sparkles } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      step: '01',
      icon: Camera,
      title: '📸 Upload',
      description: 'Upload an image of an Indian heritage site, artwork, sculpture, textile, or cultural object.',
      color: 'from-amber-500 to-saffron',
      detailTag: 'Visual Input',
    },
    {
      step: '02',
      icon: Cpu,
      title: '🤖 AI Recognition',
      description: 'Our AI analyzes the image and identifies the heritage object with archaeological precision.',
      color: 'from-saffron to-gold',
      detailTag: 'Computer Vision',
    },
    {
      step: '03',
      icon: BookOpen,
      title: '📚 Cultural Knowledge',
      description: 'Verified historical and cultural information is retrieved from archaeological databases.',
      color: 'from-gold to-emerald-500',
      detailTag: 'Zero Hallucination',
    },
    {
      step: '04',
      icon: Globe2,
      title: '🌐 Indian Languages',
      description: 'Choose your preferred Indian language — English, தமிழ் (Tamil), हिंदी (Hindi), Marathi, Bengali.',
      color: 'from-emerald-500 to-sky-500',
      detailTag: 'Native Idioms',
    },
    {
      step: '05',
      icon: Headphones,
      title: '🔊 Listen and Learn',
      description: 'Listen to the cultural story through native voice narration and test your knowledge with interactive quizzes.',
      color: 'from-sky-500 to-purple-500',
      detailTag: 'Voice + Quiz',
    },
  ];

  return (
    <section id="how-it-works" className="py-20 lg:py-28 relative overflow-hidden bg-royal-900/60 border-y border-gold/10">
      {/* Background accents */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-saffron/10 border border-saffron/30 text-saffron text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Seamless 5-Step Pipeline
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-heritage tracking-tight text-white">
            How <span className="text-gold-gradient">VirasatAI</span> Works
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            From visual observation to deep cultural storytelling in your native mother tongue.
          </p>
        </div>

        {/* 5-Step Grid with Connecting Graphic */}
        <div className="relative">
          
          {/* Connecting glowing line for desktop */}
          <div className="hidden lg:block absolute top-1/2 left-8 right-8 h-1 bg-gradient-to-r from-saffron via-gold to-purple-500 -translate-y-12 opacity-30 pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 relative z-10">
            {steps.map((item, index) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.12 }}
                  className="glass-card rounded-2xl p-6 relative group hover:border-gold/50 transition-all flex flex-col justify-between"
                >
                  {/* Step Number Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-black font-heritage text-slate-500 group-hover:text-gold transition-colors">
                      {item.step}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                      {item.detailTag}
                    </span>
                  </div>

                  {/* Icon Circle */}
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${item.color} flex items-center justify-center text-slate-950 shadow-lg shadow-saffron/10 mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="w-7 h-7" />
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-2 mb-2">
                    <h3 className="text-lg font-bold text-white font-heritage">
                      {item.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Arrow Indicator for Mobile/Sequential feel */}
                  {index < steps.length - 1 && (
                    <div className="lg:hidden flex justify-center pt-3 text-gold">
                      <ArrowRight className="w-5 h-5 rotate-90 md:rotate-0" />
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

        </div>

      </div>
    </section>
  );
};
