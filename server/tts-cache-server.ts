import express from 'express';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

const app = express();
app.use(express.json({ limit: '1mb' }));

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (_req.method === 'OPTIONS') { res.sendStatus(204); return; }
  next();
});

function cacheKey(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (Math.imul(h, 33) ^ text.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

function splitChunks(text: string): string[] {
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

app.post('/api/tts', async (req, res) => {
  const { text } = req.body as { text?: string };
  if (!text) { res.status(400).json({ error: 'text required' }); return; }

  const p = path.join(CACHE_DIR, `${cacheKey(text)}.json`);
  if (fs.existsSync(p)) {
    const cached = JSON.parse(fs.readFileSync(p, 'utf8')) as { chunks: string[] };
    console.log(`[TTS] cache hit: "${text.slice(0, 40)}…"`);
    res.json({ chunks: cached.chunks });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) { res.status(500).json({ error: 'GEMINI_API_KEY not set' }); return; }

  const ai = new GoogleGenAI({ apiKey });
  const chunks = splitChunks(text);
  const results: string[] = [];

  try {
    for (const chunk of chunks) {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-tts',
        contents: [{ role: 'user', parts: [{ text: chunk }] }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
        } as any,
      });
      const b64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('no audio in response');
      results.push(b64);
    }
    fs.writeFileSync(p, JSON.stringify({ text, chunks: results }));
    console.log(`[TTS] fetched & cached: "${text.slice(0, 40)}…"`);
    res.json({ chunks: results });
  } catch (err: any) {
    console.error('[TTS] Gemini error:', err?.message ?? err);
    res.status(502).json({ error: err?.message ?? 'gemini error' });
  }
});

app.listen(3001, () => console.log('[TTS Server] listening on http://localhost:3001'));
