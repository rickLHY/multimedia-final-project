/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI } from '@google/genai';

declare const __GEMINI_API_KEY__: string;

class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  private alarmInterval: ReturnType<typeof setInterval> | null = null;
  private isMuted = false;
  private geminiClient: GoogleGenAI | null = null;
  private currentSource: AudioBufferSourceNode | null = null;
  private speakVersion = 0;
  private contextReadyCallbacks: Array<() => void> = [];

  // In-memory cache (session) + localStorage persistence across reloads
  private audioCache = new Map<string, string[]>();
  private static readonly LS_PREFIX = 'tts_v1_';

  /** Set by the consumer to receive loading state updates for the play button. */
  public onLoadingChange: ((loading: boolean) => void) | null = null;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('click', () => this.tryResume(), true);
    }
  }

  // ── AudioContext ────────────────────────────────────────────────────────────

  private initCtx() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (Ctx) this.ctx = new Ctx();
    }
  }

  private async tryResume() {
    if (!this.ctx) this.initCtx();
    if (this.ctx?.state === 'suspended') {
      try { await this.ctx.resume(); } catch { return; }
    }
    if (this.ctx?.state === 'running') {
      const cbs = this.contextReadyCallbacks.splice(0);
      cbs.forEach(cb => cb());
    }
  }

  private waitForContext(): Promise<void> {
    if (this.ctx?.state === 'running') return Promise.resolve();
    this.initCtx();
    return new Promise(resolve => this.contextReadyCallbacks.push(resolve));
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  private cleanText(text: string): string {
    return text
      .replace(/\n\n+/g, '。')
      .replace(/\n/g, '，')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }

  private splitChunks(text: string): string[] {
    const parts = text.split(/(?<=[。！？])\s*/);
    const chunks: string[] = [];
    let buf = '';
    for (const p of parts) {
      if (!p.trim()) continue;
      buf += p;
      if (buf.length >= 45) { chunks.push(buf.trim()); buf = ''; }
    }
    if (buf.trim()) chunks.push(buf.trim());
    return chunks.length ? chunks : [text.trim()];
  }

  private getApiKey(): string {
    try { return __GEMINI_API_KEY__ ?? ''; } catch { return ''; }
  }

  // ── Persistent cache (localStorage) ─────────────────────────────────────────

  private cacheKey(text: string): string {
    // Simple djb2 hash — short enough for an LS key
    let h = 5381;
    for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
    return SoundSynthesizer.LS_PREFIX + h.toString(36);
  }

  private lsRead(text: string): string[] | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(text));
      return raw ? (JSON.parse(raw) as string[]) : null;
    } catch { return null; }
  }

  private lsWrite(text: string, chunks: string[]) {
    try {
      localStorage.setItem(this.cacheKey(text), JSON.stringify(chunks));
    } catch { /* storage quota exceeded — silently skip */ }
  }

  private fromCache(text: string): string[] | null {
    // 1. in-memory (fastest)
    const mem = this.audioCache.get(text);
    if (mem) return mem;
    // 2. localStorage (survives page reload)
    const stored = this.lsRead(text);
    if (stored) { this.audioCache.set(text, stored); return stored; }
    return null;
  }

  private toCache(text: string, chunks: string[]) {
    this.audioCache.set(text, chunks);
    this.lsWrite(text, chunks);
  }

  private getGemini(apiKey: string): GoogleGenAI {
    if (!this.geminiClient) this.geminiClient = new GoogleGenAI({ apiKey });
    return this.geminiClient;
  }

  private async fetchAudio(text: string, apiKey: string): Promise<string> {
    const ai = this.getGemini(apiKey);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ role: 'user', parts: [{ text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
      } as any,
    });
    const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!b64) throw new Error('No audio in response');
    return b64;
  }

  private async playPCM(base64: string, version: number): Promise<void> {
    if (version !== this.speakVersion || !this.ctx) return;

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

    return new Promise(resolve => {
      source.onended = () => { this.currentSource = null; resolve(); };
      source.start();
    });
  }

  private stopCurrentSource() {
    if (this.currentSource) {
      try { this.currentSource.stop(); } catch { /* already stopped */ }
      this.currentSource = null;
    }
  }

  // ── Pre-fetch (background, no playback) ─────────────────────────────────────

  /** Call on step / mode change. Downloads audio silently so playNarration() is instant. */
  public prefetch(text: string): void {
    const cleaned = this.cleanText(text);
    // Hit localStorage first — if already cached, no API call needed
    if (this.fromCache(cleaned)) return;

    const apiKey = this.getApiKey();
    if (!apiKey) return;

    const chunks = this.splitChunks(cleaned);
    this.fetchAllInBackground(chunks, apiKey, cleaned);
  }

  private async fetchAllInBackground(chunks: string[], apiKey: string, text: string) {
    const results: string[] = [];
    try {
      for (const chunk of chunks) {
        results.push(await this.fetchAudio(chunk, apiKey));
      }
      this.toCache(text, results);
      console.log(`[TTS] Cached (localStorage): "${text.slice(0, 30)}…"`);
    } catch (err) {
      console.warn('[TTS] prefetch failed:', err);
    }
  }

  // ── Play narration on demand ─────────────────────────────────────────────────

  private async fetchFromServer(text: string): Promise<string[] | null> {
    try {
      const res = await fetch('http://localhost:3001/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) return null;
      const data = await res.json() as { chunks: string[] };
      return data.chunks ?? null;
    } catch {
      return null;
    }
  }

  /** Play narration when user clicks the button. Uses cache if available. */
  public playNarration(text: string): void {
    if (this.isMuted) return;

    const cleaned = this.cleanText(text);
    this.stopCurrentSource();
    this.contextReadyCallbacks = [];

    const version = ++this.speakVersion;

    const cached = this.fromCache(cleaned);
    if (cached) {
      this.playFromCache(cached, version);
      return;
    }

    this.onLoadingChange?.(true);
    this.playNarrationAsync(cleaned, version);
  }

  private async playNarrationAsync(cleaned: string, version: number): Promise<void> {
    const done = () => this.onLoadingChange?.(false);

    // 1. Try local cache server
    const serverChunks = await this.fetchFromServer(cleaned);
    if (version !== this.speakVersion) { done(); return; }
    if (serverChunks) {
      this.toCache(cleaned, serverChunks);
      done();
      await this.playFromCache(serverChunks, version);
      return;
    }

    // 2. Fall back: call Gemini directly if API key is available
    const apiKey = this.getApiKey();
    if (apiKey) {
      const chunks = this.splitChunks(cleaned);
      await this.fetchAndPlay(chunks, apiKey, version, cleaned, done);
      return;
    }

    // 3. Last resort: browser speechSynthesis
    done();
    this.fallbackSpeech(cleaned, version);
  }

  private fallbackSpeech(text: string, version: number): void {
    if (!window.speechSynthesis || version !== this.speakVersion) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'zh-TW';
    utter.rate = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'zh-TW') ?? voices.find(v => v.lang.startsWith('zh'));
    if (voice) utter.voice = voice;
    window.speechSynthesis.speak(utter);
  }

  private async playFromCache(chunks: string[], version: number) {
    await this.waitForContext();
    for (const data of chunks) {
      if (version !== this.speakVersion) return;
      await this.playPCM(data, version);
    }
  }

  private async fetchAndPlay(
    chunks: string[], apiKey: string, version: number, fullText: string,
    onFirstReady?: () => void,
  ) {
    let signalled = false;
    const signal = () => { if (!signalled) { signalled = true; onFirstReady?.(); } };

    for (const chunk of chunks) {
      if (version !== this.speakVersion) { signal(); return; }
      try {
        const data = await this.fetchAudio(chunk, apiKey);
        if (version !== this.speakVersion) { signal(); return; }
        signal(); // first chunk fetched — stop showing spinner
        await this.waitForContext();
        if (version !== this.speakVersion) return;
        await this.playPCM(data, version);
      } catch (err) {
        console.warn('[TTS] chunk failed, falling back to browser speech:', err);
        signal();
        this.fallbackSpeech(fullText, version);
        return;
      }
    }
    signal();
  }

  /** Stop any playing narration (called by startAlarm and setMute). */
  public stopNarration(): void {
    this.stopCurrentSource();
    this.contextReadyCallbacks = [];
    ++this.speakVersion; // invalidate in-flight fetches
    try { window.speechSynthesis?.cancel(); } catch { /* ignore */ }
  }

  // ── Mute ────────────────────────────────────────────────────────────────────

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (muted) { this.stopAlarm(); this.stopNarration(); }
  }

  // ── Alarm beep ───────────────────────────────────────────────────────────────

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
    this.stopNarration(); // narration and alarm never overlap
    if (this.isMuted || this.alarmInterval) return;
    this.playWarningBeep();
    this.alarmInterval = setInterval(() => this.playWarningBeep(), 840);
  }

  public stopAlarm() {
    if (this.alarmInterval) { clearInterval(this.alarmInterval); this.alarmInterval = null; }
    this.stopCurrentSource();
  }
}

export const soundSynthesizer = new SoundSynthesizer();
