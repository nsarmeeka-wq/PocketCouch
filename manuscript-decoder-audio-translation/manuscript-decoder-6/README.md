# Manuscript Decoder - Audio Translation Feature

## ✨ What's New

### Audio Translations Column
A new **"Audio translations"** tab in the decoder workspace that shows:
- All 11 supported languages side-by-side
- Each language translation displayed
- **Speaker button** 🔊 next to each language to listen to the translation

## 🎯 How to Use

1. Upload a manuscript or select a sample
2. Click "Run demo decoder"
3. Once decoding completes, click the **"Audio translations"** tab
4. Click the speaker icon next to any language to hear it read aloud
5. Different system voices will be used for different languages

## 🗣️ Supported Languages

1. English
2. Spanish
3. French
4. German
5. Portuguese
6. Arabic
7. Chinese (Mandarin)
8. Japanese
9. Korean
10. Hindi
11. Tamil

## 🛠️ Setup

```bash
# Extract zip
# Open terminal in the project folder (where package.json is)

npm install
npm run dev

# Open: http://localhost:3000
```

## 📁 Key Files

- `/components/audio-speaker-button.tsx` - Reusable audio button component
- `/lib/text-to-speech.ts` - Text-to-speech utility for all languages
- `/components/decoder-workspace.tsx` - Updated with Audio Translations tab

## 📝 Notes

- Audio quality depends on your system's installed language voices
- Works best in Chrome, Firefox, Safari, and Edge
- Some languages (especially Indic languages) may require language pack installation on your OS
- Translations are fixed demo content, not real OCR output

## 🚀 Deploy to Vercel

```bash
git init
git add .
git commit -m "Add audio translation feature"
git remote add origin https://github.com/YOUR_USERNAME/repo.git
git push -u origin main

# Then import on Vercel.com
```

---

**Version**: Manuscript Decoder with Audio Translations
**Date**: September 11, 2026
