# Manuscript Decoder 6 - New Features & Updates

## ✨ What's New

### 1. **Community Feedback Board** (Site-wide)
- **New Navigation Item**: "Feedback" in the sidebar (with message icon)
- **Share Feedback**: Form to submit feedback with:
  - Optional name
  - Category (Decoding accuracy, Bug report, Suggestion, Praise, Other)
  - 5-star rating
  - Message text
- **Community Feed**: Shared feedback board visible to all users on this device/browser
- **Audio Playback in Multiple Languages**: Click the speaker icon next to any feedback to hear it read aloud in:
  - English, Spanish, French, German, Portuguese, Arabic, Chinese, Japanese, Korean, Hindi, Tamil
- **Helpful Votes**: Click "Helpful" to upvote useful feedback
- **Remove Option**: Delete feedback entries you posted
- **Data Storage**: Uses browser localStorage (stored locally on this device)

**Location**: `/components/feedback-board.tsx`
**Data**: `/lib/feedback.ts`

### 2. **Audio Translation for All Languages** 
- **Text-to-Speech Utility**: New reusable module for speaking text in any supported language
- **Audio Speaker Button**: Reusable component to play audio in any language
- **Features**:
  - Play/stop button with smooth state management
  - Works across all supported languages (11 total)
  - Respects browser's installed language voices
  - Error handling with user-friendly messages
  - Visual feedback (pulsing icon when playing)

**Components**:
- `/components/audio-speaker-button.tsx` — Reusable audio button
- `/lib/text-to-speech.ts` — Core speech synthesis utility

**Integration Points**:
- Feedback Board: Each feedback entry can be heard in 11 different languages
- Decoder Workspace: Existing "Listen" button now uses the new unified utility
- Future: Can be added to any translation display in the app

### 3. **Enhanced Decoder Workspace**
- Updated the `listen()` function to use the new centralized text-to-speech system
- Imports AudioSpeakerButton for potential UI enhancements
- Cleaner, more maintainable audio code

**File**: `/components/decoder-workspace.tsx`

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+ 
- npm or pnpm

### Installation
```bash
# 1. Extract the zip file
# 2. Open a terminal in the project root folder (where package.json is)

# 3. Install dependencies
npm install

# 4. Run development server
npm run dev

# 5. Open http://localhost:3000 in your browser
```

### Deployment to Vercel
```bash
# Option 1: Push to GitHub and connect to Vercel
git push origin main

# Option 2: Direct Vercel CLI
vercel deploy
```

## 📁 New Files Added

| File | Purpose |
|------|---------|
| `/lib/text-to-speech.ts` | Core text-to-speech utility with language support |
| `/lib/feedback.ts` | Feedback data management (localStorage) |
| `/components/audio-speaker-button.tsx` | Reusable audio playback button component |
| `/components/feedback-board.tsx` | Full feedback board UI with audio translations |

## 🎯 How to Use

### Add Feedback
1. Click "Feedback" in the sidebar
2. Fill in the form (name optional, category, rating, message)
3. Click "Post feedback"
4. Your feedback appears on the community board

### Listen to Feedback in Different Languages
1. On any feedback entry, click "Hear in other languages"
2. Select a language by clicking the speaker icon next to it
3. Audio plays using your browser's text-to-speech voice for that language
4. Click the icon again to stop

### Technical Notes
- **Audio depends on**: Browser's Web Speech API and installed language voices
- **Best support**: English, Mandarin Chinese, Spanish (usually pre-installed on most systems)
- **Indic languages**: Requires system-level language voice installation (varies by OS)
- **Data persistence**: Feedback stays in localStorage; cleared when browser data is cleared
- **Cross-device sync**: Not yet implemented (would require database backend)

## 🚀 Future Enhancements

- [ ] Backend database for cross-device feedback sync
- [ ] AI-powered translation (instead of browser TTS)
- [ ] Feedback moderation system
- [ ] Export feedback as PDF/CSV report
- [ ] Search/filter feedback by category or language
- [ ] Anonymous feedback option

## 📝 Known Limitations

1. **Feedback Storage**: Only stored in browser localStorage
   - Clears when browser data is cleared
   - Not synced across devices or users
   - Use Supabase/Firebase to enable cross-user sync

2. **Audio Quality**: Depends on system voices
   - Some languages may not have high-quality voices installed
   - Pronunciation varies by browser and OS

3. **Manuscript Decoding**: Still uses fixed demo results
   - No real OCR or translation models connected
   - For production, integrate TrOCR, IndicTrans2, or Bhashini

## 🔧 Architecture

```
Feedback Flow:
User Input (feedback-board form)
  ↓
addFeedback() in lib/feedback.ts
  ↓
localStorage update
  ↓
subscribeFeedback() listener fires
  ↓
UI re-renders with new feedback

Audio Flow:
User clicks speaker button (audio-speaker-button.tsx)
  ↓
speak(text, language) in lib/text-to-speech.ts
  ↓
window.speechSynthesis.speak(utterance)
  ↓
Browser renders audio with system voice
  ↓
stopSpeech() when done or cancelled
```

## 🐛 Troubleshooting

### "No suitable voice available for [Language]"
- Your system doesn't have that language's voice installed
- Try a different language
- On Windows: Settings → Time & Language → Add language
- On macOS: System Preferences → Accessibility → Speech

### Feedback disappears after refresh
- Feedback is stored in localStorage
- It's cleared if you clear browser data
- To persist, migrate to a backend database

### Audio not working
- Check browser console for errors
- Ensure you have browser microphone/speaker permissions
- Some languages require language pack installation

## 📞 Support

For issues or questions:
1. Check the browser console (F12) for error messages
2. Verify all language voices are installed on your system
3. Try a different browser (Chrome, Firefox, Safari, Edge all support Web Speech API)
4. Contact support with error details from the console

---

**Version**: Manuscript Decoder 6 with Feedback & Audio Translation
**Last Updated**: September 11, 2026
