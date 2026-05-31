/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

// Injected at build time by vite.config define
declare const __GEMINI_API_KEY__: string;

// ─────────────────────────────────────────────────────────────────────────────
class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private alarmInterval: ReturnType<typeof setInterval> | null = null;
  private isMuted = false;

  private geminiClient: GoogleGenAI | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private speakVersion = 0;

  constructor() {}

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private getApiKey(): string {
    try { return __GEMINI_API_KEY__ ?? ''; } catch { return ''; }
  }

  private getGemini(apiKey: string): GoogleGenAI {
    if (!this.geminiClient) this.geminiClient = new GoogleGenAI({ apiKey });
    return this.geminiClient;
  }

  private initCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  private stopCurrentSource() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────────

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      this.stopAlarm();
      this.stopCurrentSource();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
  }

  public speak(text: string, enabled: boolean): void {
    if (!enabled || this.isMuted) return;

    // Normalize newlines → natural pause punctuation
    const cleaned = text
      .replace(/\n\n+/g, '。')
      .replace(/\n/g, '，')
      .replace(/[ \t]+/g, ' ')
      .trim();

    // Cancel anything currently playing
    this.stopCurrentSource();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const version = ++this.speakVersion;
    const apiKey = this.getApiKey();

    if (apiKey) {
      console.log('[TTS] Using Gemini TTS');
      this.speakGemini(cleaned, apiKey, version).catch(err => {
        console.warn('[TTS] Gemini TTS failed:', err);
      });
    } else {
      console.warn('[TTS] No GEMINI_API_KEY found — audio disabled');
    }
  }

  private async speakGemini(text: string, apiKey: string, version: number) {
    this.initCtx();
    if (!this.ctx) throw new Error('No AudioContext');

    const ai = this.getGemini(apiKey);

    let response;
    try {
      // Try the dedicated TTS model first (highest quality)
      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        } as any,
      });
    } catch {
      // Fall back to gemini-2.0-flash-exp if the TTS model isn't available
      response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        } as any,
      });
    }

    if (version !== this.speakVersion) return;

    const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
    const b64 = inlineData?.data;
    if (!b64) throw new Error('Gemini response contained no audio data');

    console.log('[TTS] Gemini audio received, playing...');
    await this.playPCM(b64, version);
  }

  private async playPCM(base64: string, version: number) {
    if (!this.ctx || version !== this.speakVersion) return;

    // Gemini returns 16-bit signed PCM @ 24 kHz, mono, little-endian
    const raw = atob(base64);
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);

    const pcm = new Int16Array(bytes.buffer);
    const buf = this.ctx.createBuffer(1, pcm.length, 24000);
    const ch  = buf.getChannelData(0);
    for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 32768;

    const source = this.ctx.createBufferSource();
    source.buffer = buf;
    source.connect(this.ctx.destination);
    this.currentSource = source;

    return new Promise<void>(resolve => {
      source.onended = () => { this.currentSource = null; resolve(); };
      source.start();
    });
  }

  // ── Alarm beep ────────────────────────────────────────────────────────────────

  public playWarningBeep() {
    if (this.isMuted) return;
    this.initCtx();
    if (!this.ctx) return;
    try {
      const osc  = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.22);
    } catch { /* ignore */ }
  }

  public startAlarm() {
    if (this.isMuted || this.alarmInterval) return;
    this.playWarningBeep();
    this.alarmInterval = setInterval(() => this.playWarningBeep(), 840);
  }

  public stopAlarm() {
    if (this.alarmInterval) { clearInterval(this.alarmInterval); this.alarmInterval = null; }
    this.stopCurrentSource();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }
}

export const soundSynthesizer = new SoundSynthesizer();
