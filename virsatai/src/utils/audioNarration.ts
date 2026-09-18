import { LanguageCode } from '../types/heritage';

class AudioNarrationService {
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private audioContext: AudioContext | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private droneGain: GainNode | null = null;
  private isDroneActive = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
  }

  /**
   * Speak text in the given Indian language using Web Speech API
   */
  public speak(
    text: string,
    lang: LanguageCode,
    options?: {
      rate?: number;
      pitch?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): void {
    if (!this.synth) {
      console.warn('Web Speech API is not supported in this browser.');
      return;
    }

    this.stop();

    const utterance = new SpeechSynthesisUtterance(text);
    this.currentUtterance = utterance;

    // Set BCP-47 language tags for Indian languages
    switch (lang) {
      case 'ta':
        utterance.lang = 'ta-IN';
        break;
      case 'hi':
        utterance.lang = 'hi-IN';
        break;
      case 'mr':
        utterance.lang = 'mr-IN';
        break;
      case 'bn':
        utterance.lang = 'bn-IN';
        break;
      case 'te':
        utterance.lang = 'te-IN';
        break;
      case 'en':
      default:
        utterance.lang = 'en-IN';
        break;
    }

    utterance.rate = options?.rate || 0.95; // Slightly slower for clear cultural storytelling
    utterance.pitch = options?.pitch || 1.0;

    // Pick best matching voice if available
    const voices = this.synth.getVoices();
    const matchingVoice = voices.find(
      (v) => v.lang.startsWith(utterance.lang) || v.lang.includes(lang)
    );
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => {
      if (options?.onStart) options.onStart();
    };

    utterance.onend = () => {
      if (options?.onEnd) options.onEnd();
    };

    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      if (options?.onError) options.onError(e);
      if (options?.onEnd) options.onEnd();
    };

    this.synth.speak(utterance);
  }

  public pause(): void {
    if (this.synth && this.synth.speaking) {
      this.synth.pause();
    }
  }

  public resume(): void {
    if (this.synth && this.synth.paused) {
      this.synth.resume();
    }
  }

  public stop(): void {
    if (this.synth) {
      this.synth.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    return !!(this.synth && this.synth.speaking && !this.synth.paused);
  }

  public isPaused(): boolean {
    return !!(this.synth && this.synth.paused);
  }

  /**
   * Serene Indian classical drone synthesizer (Tanpura C# / Pa-Sa harmonic resonance)
   * via pure Web Audio API without needing external MP3 assets.
   */
  public toggleAmbientDrone(enable?: boolean): boolean {
    const shouldEnable = enable !== undefined ? enable : !this.isDroneActive;

    if (shouldEnable) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!this.audioContext) {
          this.audioContext = new AudioCtx();
        }

        if (this.audioContext.state === 'suspended') {
          this.audioContext.resume();
        }

        // Stop any existing drone
        this.stopAmbientDrone();

        const baseFreq = 138.59; // C#3 (Sa) - meditative root frequency in Indian Classical Music
        const paFreq = baseFreq * 1.5; // Pa (Fifth - 207.88 Hz)
        const saHigh = baseFreq * 2; // High Sa (277.18 Hz)

        this.droneGain = this.audioContext.createGain();
        this.droneGain.gain.setValueAtTime(0.001, this.audioContext.currentTime);
        this.droneGain.gain.exponentialRampToValueAtTime(0.04, this.audioContext.currentTime + 2.5);
        this.droneGain.connect(this.audioContext.destination);

        const freqs = [baseFreq, paFreq, saHigh, baseFreq * 0.5];
        this.droneOscillators = freqs.map((freq, idx) => {
          const osc = this.audioContext!.createOscillator();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq + (Math.random() * 0.4 - 0.2), this.audioContext!.currentTime);
          osc.connect(this.droneGain!);
          osc.start();
          return osc;
        });

        this.isDroneActive = true;
        return true;
      } catch (err) {
        console.warn('AudioContext ambient drone could not start:', err);
        return false;
      }
    } else {
      this.stopAmbientDrone();
      return false;
    }
  }

  public stopAmbientDrone(): void {
    if (this.droneGain && this.audioContext) {
      try {
        this.droneGain.gain.setValueAtTime(this.droneGain.gain.value, this.audioContext.currentTime);
        this.droneGain.gain.exponentialRampToValueAtTime(0.0001, this.audioContext.currentTime + 1.2);
        setTimeout(() => {
          this.droneOscillators.forEach((osc) => {
            try {
              osc.stop();
              osc.disconnect();
            } catch (e) {}
          });
          this.droneOscillators = [];
        }, 1300);
      } catch (e) {}
    }
    this.isDroneActive = false;
  }

  public getIsDroneActive(): boolean {
    return this.isDroneActive;
  }
}

export const audioService = new AudioNarrationService();
