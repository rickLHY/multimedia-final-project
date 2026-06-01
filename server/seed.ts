/**
 * One-time script: fetch TTS audio for all 4 guide narrations and save to cache.
 * Run once: npm run seed
 */
import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, 'cache');
fs.mkdirSync(CACHE_DIR, { recursive: true });

// ── Same GUIDE data as StepGuideSidebar.tsx ──────────────────────────────────
const GUIDE = {
  MARGIN_BUY: {
    1: {
      title: '融資購買：核心概念與利息成本',
      description: '融資是向券商借款買股，形成兩倍槓桿。帳戶權益 ＝ 股票市值 − 借款 ＋ 股利收入 − 利息費用。利息會隨時間累積，即使股價不動，帳戶權益也會慢慢縮水，甚至提早觸發追繳。',
      steps: [
        '輸入交易股數與初始買入單價',
        '調整融資年利率（預設 6.5%）與持有天數',
        '按「⏩ +30 天」觀察利息累積如何侵蝕帳戶權益',
        '補注額外現金可降低槓桿，提升安全邊際',
        '若有股利收入，輸入每股股利（正面效果，提升權益）',
        '確認資金結構後，點選「開啟動態沙盒」',
      ],
    },
    2: {
      title: '融資沙盒：股價下跌 × 利息侵蝕',
      description: '拖動滑桿向左模擬股價下跌，同時觀察利息與時間的雙重壓力。即使股價回升，累積的利息費用仍會壓低帳戶權益，延遲獲利或提早觸發追繳。',
      steps: [
        '向左拖動滑桿：模擬股價持續下跌',
        '觀察藍色借款固定，綠色權益因股價＋利息雙重縮水',
        '按「⏩ +30 天」：即使股價不動，利息也讓成數下降',
        '成數跌破 MMR → 全螢幕警報與追繳通知啟動',
        '追繳後選擇：① 補現金 ② 賣股減倉 ③ 被強制斷頭',
        '點選「恢補」按鈕可重置股價至初始值',
      ],
    },
  },
  SHORT_SALE: {
    1: {
      title: '融券放空：核心概念與股利責任',
      description: '融券是借股賣出、等跌後買回。股利責任是放空最被忽視的風險：借券期間若公司發放股利，放空者必須自掏腰包補償出借方。獲利公式：期初賣出 −（買回成本 ＋ 股利補償 ＋ 借券費用）。',
      steps: [
        '輸入放空股數與初始放空單價',
        '調整借券年費率（預設 3%）與放空天數',
        '設定每股股利補償，或按「⚡ 突發股利」觸發 $2 股利事件',
        '觀察股利與借券費如何從權益中直接扣除',
        '調整 MMR（25%–50%），越高追繳門檻越低',
        '確認結構後，點選「開啟動態沙盒」',
      ],
    },
    2: {
      title: '融券沙盒：軋空 × 股利突發事件',
      description: '向右拖動滑桿模擬股價上漲（軋空），同時可觸發股利突發事件，雙重壓縮融券權益。股利補償 ＋ 股價上漲同時發生，是放空者最危險的情境。',
      steps: [
        '向右拖動滑桿：模擬股價持續上漲（軋空走勢）',
        '觀察橘色回補成本不斷擴大，擠壓綠色融券權益',
        '按「⚡ 突發：公司發放股利」：帳戶立即扣除股利補償',
        '股利＋漲價雙重衝擊，觀察成數如何快速崩潰',
        '成數跌破 MMR → 融券追繳警報啟動',
        '點選「恢補」按鈕可重置股價至初始值',
      ],
    },
  },
} as const;

// ── Same helpers as audio.ts / tts-cache-server.ts ───────────────────────────
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

function buildNarration(mode: keyof typeof GUIDE, step: 1 | 2): string {
  const g = GUIDE[mode][step];
  const nums = ['一', '二', '三', '四', '五', '六'];
  const stepsText = (g.steps as readonly string[]).map((s, i) => `第${nums[i]}，${s}`).join('。');
  return `${g.title}。${g.description}。操作步驟：${stepsText}。`;
}

// ── Seed ─────────────────────────────────────────────────────────────────────
const texts = [
  { label: 'MARGIN_BUY step 1',  text: buildNarration('MARGIN_BUY', 1) },
  { label: 'MARGIN_BUY step 2',  text: buildNarration('MARGIN_BUY', 2) },
  { label: 'SHORT_SALE step 1',  text: buildNarration('SHORT_SALE', 1) },
  { label: 'SHORT_SALE step 2',  text: buildNarration('SHORT_SALE', 2) },
];

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) { console.error('GEMINI_API_KEY not set in .env.local'); process.exit(1); }
const ai = new GoogleGenAI({ apiKey });

for (const { label, text } of texts) {
  const p = path.join(CACHE_DIR, `${cacheKey(text)}.json`);
  if (fs.existsSync(p)) {
    console.log(`[skip] already cached: ${label}`);
    continue;
  }

  console.log(`[fetch] ${label} …`);
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
    console.log(`[done]  ${label} → ${p}`);
  } catch (err: any) {
    console.error(`[fail]  ${label}: ${err?.message ?? err}`);
    process.exit(1);
  }
}

console.log('\nAll narrations cached. Start the server with: npm run server');
