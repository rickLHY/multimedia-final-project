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

// ── Slide narrations (must match NARRATIONS array in SlidesPage.tsx) ─────────
const SLIDE_NARRATIONS = [
  '槓桿是一把雙向刃。融資讓你借錢買股，看多時放大報酬。融券讓你借股賣空，看空時鎖定利潤。兩者都能放大獲利，也同樣放大風險與隱藏成本。',
  '透過保證金帳戶，投資人能操作超過自身本金的部位。然而，槓桿放大的不僅是潛在報酬，還包含下檔風險與不斷累積的經常性成本。',
  '融資買進的機制：準備自備款作為初始保證金，向券商借入剩餘資金。在市場上買進股票，股票成為抵押品。權益數等於總資產市值減去借款本金。',
  '維持保證金是帳戶權益數的最低容忍底線，交易所規定最低為百分之二十五。當股價下跌，權益如水位蒸發。跌破紅線觸發追繳，未及時補繳則強制平倉。',
  '融資交易是在與時間賽跑，利息是恆定的下行引力。股價上漲三成，報酬因利息侵蝕僅有五成一。股價不變，持倉即每日虧損。股價下跌，本金虧損疊加利息，加速崩塌。',
  '追繳臨界點的計算：當股票市值跌至借款除以一減去維持保證金，就會觸發追繳。以一千股、初始價七十美元、維持保證金四成為例，借款三萬五千美元，追繳價位為五十八點三三美元。你可以在模擬器中親自體驗這個臨界點。',
  '融券放空的機制：預期股價下跌，向券商借入股票並在市場賣出。賣出所得現金與原始保證金共同鎖在帳戶中。未來需回補，買回股票還給券商。權益數等於保證金帳戶總額減去融券市值。',
  '放空的風險是倒置的。融資借的是現金，負債固定。融券借的是股票，負債隨股價無限膨脹。股價最多跌到零，放空最大利潤為百分之百。但股價理論上沒有上限，放空虧損因此沒有上限。',
  '股利對做多有利，對做空是額外成本。做多者獲得股利，收益增加。融券者不擁有股票，在除息日必須自掏腰包補償股利給原出借人。放空高殖利率股票，面臨沉重的股利償還負擔。',
  '融券追繳臨界點的計算：當股價漲至保證金帳戶總額除以一加維持保證金，就會觸發追繳。以一百股、放空價六十美元、維持保證金三成為例，帳戶總額九千美元，追繳價位為六十九點二三美元。',
  '最後的總結對比。融資看多，借入現金，隱藏成本是融資利息，最大風險為本金全損。融券看空，借入股票，隱藏成本是股利補償，最大風險理論上無上限。槓桿是工具，不是魔法。理解雙面刃，才能駕馭它。',
];

// ── Seed ─────────────────────────────────────────────────────────────────────
const texts = [
  { label: 'MARGIN_BUY step 1',  text: buildNarration('MARGIN_BUY', 1) },
  { label: 'MARGIN_BUY step 2',  text: buildNarration('MARGIN_BUY', 2) },
  { label: 'SHORT_SALE step 1',  text: buildNarration('SHORT_SALE', 1) },
  { label: 'SHORT_SALE step 2',  text: buildNarration('SHORT_SALE', 2) },
  ...SLIDE_NARRATIONS.map((text, i) => ({ label: `slides slide ${i + 1}`, text })),
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
