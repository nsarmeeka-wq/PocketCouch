# 🎵 Manuscript Decoder - Audio Translation - Quick Start

## ✨ New Feature: Audio Translations Tab

When you decode a manuscript, you'll see a new **"Audio translations"** tab that lets you:
- Listen to the translation in **11 different languages**
- Click speaker buttons to hear each language
- Preview the translation text before listening

## 🚀 Setup (3 Steps)

### Step 1: Extract ZIP
- Right-click: `manuscript-decoder-audio-translation.zip`
- Select: "Extract All..."
- Extract to: `C:\25IT1202\Projects\my-app` (or any folder name)

### Step 2: Install & Run
Open terminal in the extracted folder:

```bash
npm install
npm run dev
```

### Step 3: Open in Browser
Go to: `http://localhost:3000`

## 🎯 Try the Audio Feature

1. Click **"Decode"** in the sidebar
2. Select a sample manuscript or upload your own image
3. Click **"Run demo decoder"**
4. Once complete, click the **"Audio translations"** tab (with speaker icon 🔊)
5. Click any language's speaker button to listen

## 🗣️ Languages Available

✅ English  
✅ Spanish  
✅ French  
✅ German  
✅ Portuguese  
✅ Arabic  
✅ Chinese (Mandarin)  
✅ Japanese  
✅ Korean  
✅ Hindi  
✅ Tamil  

## ⚙️ How It Works

- **Text-to-Speech**: Uses your browser's built-in speech synthesis
- **Language Support**: 11 languages with automatic voice selection
- **No Upload**: All processing happens in your browser
- **System Voices**: Quality depends on your OS language settings

## ❓ Troubleshooting

### No sound when clicking speaker?
- Check that you have system language voices installed
- **Windows**: Settings → Time & Language → Add language
- **Mac**: System Preferences → Accessibility → Speech
- Try a different language (English usually works best)

### npm install fails?
- Make sure you're in the correct folder (check for `package.json`)
- Run: `npm cache clean --force`
- Then: `npm install` again

### Port 3000 in use?
- Run: `npm run dev -- -p 3001`

## 📂 File Structure

```
manuscript-decoder-6/
├── components/
│   ├── decoder-workspace.tsx (← Updated with Audio tab)
│   ├── audio-speaker-button.tsx (← New)
│   └── ...
├── lib/
│   ├── text-to-speech.ts (← New)
│   └── ...
├── app/
├── public/
└── README.md
```

## 🚢 Deploy to Vercel

1. Push to GitHub:
```bash
git init
git add .
git commit -m "Add audio translation feature"
git remote add origin https://github.com/YOUR_USERNAME/your-repo.git
git push -u origin main
```

2. Go to Vercel.com → Import → Select your GitHub repo → Deploy

## ✅ What's Included

✅ **Audio Translations Tab** - New tab with all languages  
✅ **Speaker Buttons** - Click to listen in any language  
✅ **Text-to-Speech** - Uses browser Web Speech API  
✅ **All Original Features** - Upload, decode, translate, export  

## 📝 Notes

- Decoding is a demo (fixed results, not real OCR)
- Translations are illustrative samples
- Audio quality depends on installed browser language voices
- Best support: English, Spanish, French, German, Portuguese
- Indic languages need OS-level language pack

---

**Ready?** Extract the zip and run `npm install` → `npm run dev` → `http://localhost:3000`

Questions? Check the terminal output for error messages.
