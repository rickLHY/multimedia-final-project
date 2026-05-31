import React from 'react';
import { SimulatorMode, MultimediaMode } from '../types';
import { BookOpen, Sliders, Volume2, ChevronRight, Loader2 } from 'lucide-react';

interface StepGuideSidebarProps {
  mode: SimulatorMode;
  step: 1 | 2;
  multimediaMode: MultimediaMode;
  isLoading: boolean;
  onSpeak: () => void;
}

export const GUIDE = {
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

export default function StepGuideSidebar({ mode, step, multimediaMode, isLoading, onSpeak }: StepGuideSidebarProps) {
  const data = GUIDE[mode][step];
  const showText = multimediaMode !== 'CHART_AUDIO';
  const showAudioBtn = multimediaMode !== 'TEXT_CHART';

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-5 flex flex-col gap-4 sticky top-24">
      <div className="flex items-center gap-2 pb-3 border-b border-[#27272A]">
        {step === 1
          ? <BookOpen className="w-4 h-4 text-[#22C55E]" />
          : <Sliders className="w-4 h-4 text-[#22C55E]" />}
        <h3 className="text-sm font-bold text-[#FAFAFA]">操作簡介步驟</h3>
        <span className="ml-auto text-[10px] font-mono bg-[#09090B] border border-[#27272A] px-1.5 py-0.5 rounded text-[#A1A1AA]">
          Step {step}
        </span>
      </div>

      <p className="text-xs font-bold text-[#22C55E]">{data.title}</p>

      {showText && (
        <p className="text-xs text-[#A1A1AA] leading-relaxed border-l-2 border-[#27272A] pl-3">
          {data.description}
        </p>
      )}

      {showText ? (
        <ol className="flex flex-col gap-3">
          {data.steps.map((s, i) => (
            <li key={i} className="flex gap-2.5 items-start text-xs text-[#FAFAFA]">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#22C55E]/15 text-[#22C55E] flex items-center justify-center text-[10px] font-bold mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl flex items-center gap-2 text-xs text-[#A1A1AA]">
            <Volume2 className="w-4 h-4 text-[#22C55E] animate-pulse" />
            <span>語音模式：請聆聽步驟解說</span>
          </div>
          {data.steps.map((_, i) => (
            <div key={i} className="flex items-center gap-2 text-[10px] text-[#52525B]">
              <ChevronRight className="w-3 h-3 text-[#3f3f46]" />
              <span>步驟 {i + 1}</span>
            </div>
          ))}
        </div>
      )}

      {showAudioBtn && (
        <button
          onClick={onSpeak}
          disabled={isLoading}
          className={`mt-1 flex items-center justify-center gap-2 h-9 border rounded-xl text-xs font-semibold transition ${
            isLoading
              ? 'bg-[#09090B] border-[#27272A] text-[#52525B] cursor-not-allowed'
              : 'bg-[#09090B] border-[#27272A] hover:bg-[#27272A] text-[#FAFAFA] cursor-pointer'
          }`}
        >
          {isLoading
            ? <><Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />載入語音中…</>
            : <><Volume2 className="w-3.5 h-3.5 text-[#22C55E]" />聽取本步解說</>
          }
        </button>
      )}
    </div>
  );
}
