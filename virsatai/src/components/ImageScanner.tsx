import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Image as ImageIcon, 
  Sparkles, 
  Scan, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  RefreshCw,
  Camera
} from 'lucide-react';
import { SCAN_STAGES } from '../utils/aiVisionEngine';

interface ImageScannerProps {
  onScanStart: () => void;
  onImageSelected: (imageSource: string | File, presetId?: string) => void;
  isScanning: boolean;
  scanStageIndex: number;
  previewImage: string | null;
}

export const ImageScanner: React.FC<ImageScannerProps> = ({
  onScanStart,
  onImageSelected,
  isScanning,
  scanStageIndex,
  previewImage,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sampleTreasures = [
    { id: 'konark_wheel', name: 'Konark Sun Temple', category: 'Monuments', badge: '13th C. Odisha' },
    { id: 'sanchi_stupa', name: 'Sanchi Stupa', category: 'Monuments', badge: '3rd C. BCE Maurya' },
    { id: 'hampi_chariot', name: 'Hampi Stone Chariot', category: 'Monuments', badge: '16th C. Vijayanagara' },
    { id: 'madhubani_art', name: 'Madhubani Painting', category: 'Traditional Art', badge: 'Bihar Mithila' },
    { id: 'warli_art', name: 'Warli Tribal Art', category: 'Traditional Art', badge: 'Maharashtra Tribal' },
    { id: 'ajanta_murals', name: 'Ajanta Cave Paintings', category: 'Paintings', badge: '5th C. Vakataka' },
    { id: 'chola_nataraja', name: 'Chola Bronze Nataraja', category: 'Sculptures', badge: '10th C. Chola' },
    { id: 'banarasi_silk', name: 'Banarasi Brocade Silk', category: 'Textiles', badge: 'Varanasi Zari' },
  ];

  const supportedCategories = [
    '🏛 Monuments',
    '🛕 Temples',
    '🗿 Sculptures',
    '🎨 Paintings',
    '🖌 Traditional Art',
    '👘 Textiles',
    '🏺 Cultural Objects',
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onScanStart();
          onImageSelected(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onScanStart();
          onImageSelected(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <section id="explorer" className="py-16 lg:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gold/15 border border-gold/30 text-gold text-xs font-bold uppercase tracking-wider">
            <Scan className="w-3.5 h-3.5 animate-pulse" />
            AI Heritage Vision Scanner
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold font-heritage text-white">
            Discover Indian Heritage
          </h2>
          <p className="text-slate-300 text-base sm:text-lg">
            Upload an image and let AI reveal its story.
          </p>
        </div>

        {/* Upload & Scanning Area */}
        <div className="max-w-3xl mx-auto">
          
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`relative rounded-3xl p-8 sm:p-12 text-center transition-all duration-300 glass-card overflow-hidden ${
              isDragOver ? 'border-2 border-saffron bg-saffron/10' : 'border border-gold/30'
            }`}
          >
            {/* Animated Laser Grid Background */}
            <div className="absolute inset-0 bg-mandala-pattern opacity-40 pointer-events-none" />

            {/* Scanning Overlay State */}
            <AnimatePresence>
              {isScanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-30 bg-royal-950/92 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-6"
                >
                  {/* Circular Radar Scan */}
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-dashed border-gold/40 animate-spin-slow" />
                    <div className="absolute inset-3 rounded-full border border-saffron/40 animate-ping" />
                    <div className="w-24 h-24 rounded-full bg-slate-900 border border-gold/50 flex items-center justify-center shadow-xl shadow-saffron/30">
                      <Sparkles className="w-10 h-10 text-gold animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-2 text-center max-w-md">
                    <h3 className="text-xl font-bold font-heritage text-white">
                      VirasatAI is analyzing your heritage image...
                    </h3>
                    <p className="text-xs sm:text-sm text-gold font-medium">
                      {SCAN_STAGES[scanStageIndex]?.label || 'Processing features...'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {SCAN_STAGES[scanStageIndex]?.detail || 'Cross-referencing verified archaeological datasets.'}
                    </p>
                  </div>

                  {/* Progress Indicator Dots */}
                  <div className="flex items-center gap-2">
                    {SCAN_STAGES.map((st, idx) => (
                      <div
                        key={st.step}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          idx <= scanStageIndex ? 'w-8 bg-saffron' : 'w-2 bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Animated Laser Scanning Beam */}
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-gold to-transparent shadow-lg shadow-gold animate-scan-laser" />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Default Upload State */}
            <div className="relative z-10 flex flex-col items-center space-y-5">
              
              {/* Icon / Image Preview */}
              {previewImage ? (
                <div className="relative w-44 h-44 rounded-2xl overflow-hidden border-2 border-gold/40 shadow-xl group">
                  <img src={previewImage} alt="Uploaded Heritage" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-slate-900/90 text-gold text-xs font-semibold"
                    >
                      Change Image
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-3xl bg-royal-800/90 border border-gold/30 flex items-center justify-center shadow-lg shadow-saffron/15 text-saffron group-hover:scale-105 transition-transform">
                  <Upload className="w-9 h-9 text-gold" />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-lg sm:text-xl font-bold font-heritage text-white">
                  📸 Drag and drop your heritage image here
                </p>
                <p className="text-xs sm:text-sm text-slate-400">
                  Supports JPG, PNG, WEBP, or take a live photo
                </p>
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Upload Button */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-saffron to-gold text-slate-950 hover:brightness-110 shadow-lg shadow-saffron/20 transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image Button
                </button>

                {/* Responsible AI Low-Confidence Test Trigger */}
                <button
                  onClick={() => {
                    onScanStart();
                    onImageSelected('unverified_random_pattern');
                  }}
                  title="Test Responsible AI Guardrails (Low Confidence Alert)"
                  className="px-4 py-3 rounded-xl text-xs font-medium bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 flex items-center gap-1.5 transition-colors"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  Test Low Confidence
                </button>
              </div>

            </div>

          </div>

          {/* Supported Categories Badges */}
          <div className="mt-8 space-y-3 text-center">
            <p className="text-xs uppercase font-bold text-slate-400 tracking-wider">
              Supported Heritage Categories
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {supportedCategories.map((cat, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-royal-800/80 text-slate-300 border border-slate-700 hover:border-gold/40 transition-colors"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Sample Heritage Image Buttons for Demo */}
          <div className="mt-10 p-6 rounded-2xl glass-card border border-gold/25 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-gold" />
                <h4 className="text-sm font-bold text-white font-heritage">
                  Quick Demo Treasures (1-Click Instant Analysis)
                </h4>
              </div>
              <span className="text-[11px] text-saffron font-semibold">Hackathon Ready</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {sampleTreasures.map((treasure) => (
                <button
                  key={treasure.id}
                  onClick={() => {
                    onScanStart();
                    onImageSelected(treasure.id, treasure.id);
                  }}
                  className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-royal-700/80 border border-slate-700 hover:border-gold/50 text-left transition-all group"
                >
                  <p className="text-xs font-bold text-white group-hover:text-gold transition-colors truncate">
                    {treasure.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {treasure.badge}
                  </p>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
