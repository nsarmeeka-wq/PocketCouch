import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { HackathonDemoBar } from './components/HackathonDemoBar';
import { HeroSection } from './components/HeroSection';
import { HowItWorks } from './components/HowItWorks';
import { ImageScanner } from './components/ImageScanner';
import { HeritageResult } from './components/HeritageResult';
import { HeritageQuiz } from './components/HeritageQuiz';
import { StoryModeModal } from './components/StoryModeModal';
import { HeritageGallery } from './components/HeritageGallery';
import { ImpactSection } from './components/ImpactSection';
import { ResponsibleAI } from './components/ResponsibleAI';
import { FutureRoadmap } from './components/FutureRoadmap';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { analyzeHeritageImage, getHeritageById } from './utils/aiVisionEngine';
import { HeritageItem, LanguageCode, ScanResult } from './types/heritage';

export function App() {
  // Navigation & UI Modes
  const [currentSection, setCurrentSection] = useState('hero');
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isLargeText, setIsLargeText] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>('en');

  // Scanner & AI Result States
  const [isScanning, setIsScanning] = useState(false);
  const [scanStageIndex, setScanStageIndex] = useState(0);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activePresetId, setActivePresetId] = useState<string>('konark_wheel');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Story Mode Modal
  const [isStoryOpen, setIsStoryOpen] = useState(false);

  // Initialize with the flagship Konark Wheel on mount for instant demonstration
  useEffect(() => {
    const initialItem = getHeritageById('konark_wheel');
    if (initialItem) {
      setPreviewImage(initialItem.imageUrl);
      setScanResult({
        identified: true,
        heritageId: initialItem.id,
        item: initialItem,
        confidence: initialItem.confidenceScore,
        isVerified: true,
      });
    }
  }, []);

  const handleNavigate = (sectionId: string) => {
    setCurrentSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleScanStart = () => {
    setIsScanning(true);
    setScanStageIndex(0);
  };

  const handleImageSelected = async (imageSource: string | File, presetId?: string) => {
    if (presetId) {
      setActivePresetId(presetId);
    }
    if (typeof imageSource === 'string' && !imageSource.startsWith('data:')) {
      const found = getHeritageById(imageSource);
      if (found) {
        setPreviewImage(found.imageUrl);
      }
    } else if (typeof imageSource === 'string') {
      setPreviewImage(imageSource);
    }

    try {
      const result = await analyzeHeritageImage(
        imageSource,
        presetId,
        (stageIdx) => setScanStageIndex(stageIdx)
      );
      setScanResult(result);
      if (result.item) {
        setPreviewImage(result.item.imageUrl);
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsScanning(false);
      // Smoothly scroll down to the results dashboard
      setTimeout(() => {
        const resultElem = document.getElementById('result-dashboard');
        if (resultElem) {
          resultElem.scrollIntoView({ behavior: 'smooth' });
        }
      }, 250);
    }
  };

  const handleSelectPreset = (id: string) => {
    setActivePresetId(id);
    handleScanStart();
    handleImageSelected(id, id);
  };

  const handleSelectGalleryItem = (item: HeritageItem) => {
    setActivePresetId(item.id);
    handleScanStart();
    handleImageSelected(item.id, item.id);
  };

  const handleScrollToQuiz = () => {
    const quizElem = document.getElementById('heritage-quiz');
    if (quizElem) {
      quizElem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isHighContrast ? 'high-contrast' : ''} ${isLargeText ? 'text-lg' : ''}`}>
      
      {/* Top Sticky Navigation */}
      <Navbar
        onNavigate={handleNavigate}
        onOpenDemo={handleSelectPreset}
        onToggleHighContrast={() => setIsHighContrast(!isHighContrast)}
        isHighContrast={isHighContrast}
        onToggleLargeText={() => setIsLargeText(!isLargeText)}
        isLargeText={isLargeText}
        currentSection={currentSection}
      />

      {/* Pinned Hackathon Demo Quick Bar */}
      <HackathonDemoBar
        onSelectPreset={handleSelectPreset}
        activeId={activePresetId}
      />

      {/* Main Content Sections */}
      <main className="pb-16 lg:pb-0">
        
        {/* 1. Hero Landing Section */}
        <section id="hero">
          <HeroSection
            onExploreClick={() => handleNavigate('explorer')}
            onHowItWorksClick={() => handleNavigate('how-it-works')}
            onOpenDemo={handleSelectPreset}
          />
        </section>

        {/* 2. How It Works (5-step process) */}
        <HowItWorks />

        {/* 3. Heritage Explorer & AI Vision Scanner */}
        <ImageScanner
          onScanStart={handleScanStart}
          onImageSelected={handleImageSelected}
          isScanning={isScanning}
          scanStageIndex={scanStageIndex}
          previewImage={previewImage}
        />

        {/* 4. AI Result Dashboard */}
        {scanResult && (
          <HeritageResult
            scanResult={scanResult}
            currentLanguage={currentLanguage}
            onSelectLanguage={(lang) => setCurrentLanguage(lang)}
            onOpenStory={() => setIsStoryOpen(true)}
            onScrollToQuiz={handleScrollToQuiz}
          />
        )}

        {/* 5. Interactive Heritage Quiz */}
        {scanResult?.item?.quiz && (
          <HeritageQuiz
            questions={scanResult.item.quiz}
            currentLanguage={currentLanguage}
            heritageName={scanResult.item.names[currentLanguage] || scanResult.item.name}
            onExploreAnother={() => handleNavigate('gallery')}
          />
        )}

        {/* 6. Explore Heritage Gallery */}
        <HeritageGallery
          currentLanguage={currentLanguage}
          onSelectItem={handleSelectGalleryItem}
        />

        {/* 7. Impact Section ("Why VirasatAI Matters") */}
        <ImpactSection />

        {/* 8. Responsible AI Section ("AI You Can Trust") */}
        <ResponsibleAI />

        {/* 9. Future Roadmap */}
        <FutureRoadmap />

      </main>

      {/* Footer */}
      <Footer onNavigate={handleNavigate} />

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentSection={currentSection}
        onNavigate={handleNavigate}
        onQuickDemo={() => handleSelectPreset('konark_wheel')}
      />

      {/* Immersive "Tell Me a Story" Modal */}
      {scanResult?.item && (
        <StoryModeModal
          isOpen={isStoryOpen}
          onClose={() => setIsStoryOpen(false)}
          item={scanResult.item}
          currentLanguage={currentLanguage}
        />
      )}

    </div>
  );
}

export default App;
