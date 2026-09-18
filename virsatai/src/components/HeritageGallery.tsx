import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Compass, 
  MapPin, 
  Sparkles, 
  ArrowRight, 
  Search, 
  Filter, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { getAllHeritageItems } from '../utils/aiVisionEngine';
import { HeritageCategory, HeritageItem, LanguageCode } from '../types/heritage';

interface HeritageGalleryProps {
  currentLanguage: LanguageCode;
  onSelectItem: (item: HeritageItem) => void;
}

export const HeritageGallery: React.FC<HeritageGalleryProps> = ({
  currentLanguage,
  onSelectItem,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const allItems = getAllHeritageItems();

  const categories: Array<{ id: string; label: string }> = [
    { id: 'All', label: 'All Treasures' },
    { id: 'Monuments', label: '🏛 Monuments' },
    { id: 'Traditional Art', label: '🎨 Traditional Art' },
    { id: 'Sculptures', label: '🗿 Sculptures' },
    { id: 'Textiles', label: '👘 Textiles' },
  ];

  const filteredItems = allItems.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const name = (item.names[currentLanguage] || item.name).toLowerCase();
    const loc = (item.locations[currentLanguage] || item.location).toLowerCase();
    const query = searchQuery.toLowerCase();
    const matchesSearch = name.includes(query) || loc.includes(query) || item.state.toLowerCase().includes(query);
    return matchesCategory && matchesSearch;
  });

  return (
    <section id="gallery" className="py-20 lg:py-28 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
              <Compass className="w-3.5 h-3.5" />
              Living Museum Archive
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold font-heritage text-white">
              Explore Indian Heritage
            </h2>
            <p className="text-slate-300 text-sm sm:text-base">
              Browse verified monuments, tribal crafts, sculptures, and ancient textiles preserved across centuries.
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search temple, state, or era..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-royal-900/80 border border-slate-700 focus:border-gold focus:outline-none text-sm text-white placeholder-slate-400 shadow-inner"
            />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2.5">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-saffron to-gold text-slate-950 shadow-md shadow-saffron/20'
                  : 'bg-royal-800/80 text-slate-300 hover:text-white hover:bg-royal-700/80 border border-slate-700/80'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, index) => {
            const name = item.names[currentLanguage] || item.name;
            const location = item.locations[currentLanguage] || item.location;
            const overview = item.overview[currentLanguage] || item.overview.en;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.08 }}
                className="rounded-3xl glass-card border border-gold/25 overflow-hidden flex flex-col justify-between group glass-card-hover"
              >
                <div>
                  {/* Image with Tag Overlay */}
                  <div className="relative aspect-[4/3] w-full overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-royal-950 via-transparent to-transparent opacity-80" />

                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider bg-slate-950/80 backdrop-blur-md text-gold border border-gold/30">
                      {item.category}
                    </span>

                    <span className="absolute bottom-3 left-3 flex items-center gap-1 text-[11px] text-slate-200">
                      <MapPin className="w-3 h-3 text-saffron" />
                      <span className="truncate max-w-[180px]">{location}</span>
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-2.5">
                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <Calendar className="w-3 h-3 text-gold" />
                      <span>{item.period}</span>
                    </div>

                    <h3 className="text-lg font-bold font-heritage text-white group-hover:text-gold transition-colors leading-snug">
                      {name}
                    </h3>

                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {overview}
                    </p>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => onSelectItem(item)}
                    className="w-full py-2.5 rounded-xl font-semibold text-xs bg-slate-800 hover:bg-gold hover:text-slate-950 text-slate-200 border border-slate-700 hover:border-gold transition-all flex items-center justify-center gap-2 group/btn"
                  >
                    <span>Explore Story</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 p-8 rounded-3xl glass-card border border-slate-800 space-y-3">
            <p className="text-lg font-bold text-white">No heritage items found</p>
            <p className="text-xs text-slate-400">Try adjusting your search query or selecting "All Treasures"</p>
          </div>
        )}

      </div>
    </section>
  );
};
