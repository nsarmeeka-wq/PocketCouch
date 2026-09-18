export type LanguageCode = 'en' | 'ta' | 'hi' | 'mr' | 'bn' | 'te';

export interface LanguageMeta {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
  supported: boolean;
}

export type HeritageCategory = 
  | 'Monuments' 
  | 'Traditional Art' 
  | 'Sculptures' 
  | 'Textiles' 
  | 'Cultural Objects';

export interface QuizQuestion {
  id: string;
  question: Record<string, string>;
  options: Record<string, string[]>;
  correctIndex: number;
  explanation: Record<string, string>;
}

export interface StoryChapter {
  id: string;
  title: Record<string, string>;
  content: Record<string, string>;
  imageAccent?: string;
}

export interface StoryModeData {
  title: Record<string, string>;
  intro: Record<string, string>;
  chapters: StoryChapter[];
}

export interface HeritageItem {
  id: string;
  name: string;
  names: Record<string, string>;
  location: string;
  locations: Record<string, string>;
  state: string;
  period: string;
  category: HeritageCategory;
  imageUrl: string;
  thumbnailUrl: string;
  confidenceScore: number;
  verified: boolean;
  unescoStatus?: string;
  overview: Record<string, string>;
  culturalSignificance: Record<string, string>;
  history: Record<string, string>;
  architecture: Record<string, string>;
  facts: Record<string, string[]>;
  audioNarrationText: Record<string, string>;
  story: StoryModeData;
  quiz: QuizQuestion[];
  tags: string[];
}

export interface ScanResult {
  identified: boolean;
  heritageId?: string;
  item?: HeritageItem;
  confidence: number;
  isVerified: boolean;
  warning?: string;
  analysisFeatures?: {
    categoryDetected: string;
    artisticStyle: string;
    historicalEraEstimate: string;
    detectedMotifs: string[];
  };
}
