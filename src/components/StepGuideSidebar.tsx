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
      title: '融資購買：核心概念',
      description: '融資是用自備款的一半向券商借款買股，形成兩倍槓桿。資金結構：股票市值 ＝ 借款（固定）＋ 帳戶權益。股價跌時借款不變，權益等比縮水。MMR 是權益／市值的安全底線，跌破即追繳。',
      steps: [
        '輸入交易股數與初始買入單價',
        '初始保證金（IMR）固定 50%，自備一半即可開倉',
        '調整維持保證金比率 MMR（25%–48%）',
        'MMR 越高，追繳門檻越高，留給股價下跌的空間越小',
        '補注額外現金可降低槓桿，提升安全邊際',
        '確認資金結構後，點選「開啟動態沙盒」',
      ],
    },
    2: {
      title: '融資沙盒：觀察�槓桿壓力',
      description: '拖動滑桿向左（股價下跌），觀察借款固定、權益縮水的過程。當權益／市值 < MMR，觸發追繳警告。追繳後需補交保證金或減倉，否則券商強制斷頭。',
      steps: [
        '向左拖動滑桿：模擬股價持續下跌',
        '觀察藍色借款固定，綠色權益持續縮小',
        '留意保證金成數（Equity ÷ 市值）逼近 MMR 門檻',
        '成數跌破 MMR → 全螢幕警報與追繳通知啟動',
        '追繳後選擇：① 補交現金 ② 賣股減倉 ③ 被強制斷頭',
        '點選「恢補」按鈕可重置股價至初始值',
      ],
    },
  },
  SHORT_SALE: {
    1: {
      title: '融券放空：核心概念',
      description: '融券是借股賣出、等股價跌後買回獲利。資金結構：保證金帳戶餘額（固定）＝ 回補成本（動態）＋ 融券權益。股價漲時回補成本增加，權益被擠壓。軋空（Short Squeeze）是最大風險，股價暴漲可造成無限虧損。',
      steps: [
        '輸入放空股數與初始放空單價',
        '初始保證金（IMR）固定 50%，需繳自備款',
        '放空所得＋自備保證金 ＝ 總保證金帳戶餘額',
        '調整維持保證金比率 MMR（25%–50%）',
        'MMR 越高，追繳門檻越低，軋空風險越高',
        '確認結構後，點選「開啟動態沙盒」',
      ],
    },
    2: {
      title: '融券沙盒：體驗軋空壓力',
      description: '拖動滑桿向右（股價上漲），觀察帳戶餘額固定、回補成本暴增的過程。成數跌破 MMR，觸發融券追繳。放空理論上最大虧損是無限的，因股價沒有上限。',
      steps: [
        '向右拖動滑桿：模擬股價持續上漲（軋空走勢）',
        '觀察橘色回補成本不斷擴大，擠壓綠色融券權益',
        '保證金帳戶餘額固定，漲得越高虧得越多',
        '成數（Equity ÷ 回補成本）跌破 MMR → 警報啟動',
        '追繳後選擇：① 補交現金 ② 立即買股回補',
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
