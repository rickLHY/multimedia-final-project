import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SimulatorMode, MultimediaMode,
  MarginBuyParams, ShortSaleParams,
  CalculatedBuyState, CalculatedShortState,
} from '../types';
import { soundSynthesizer } from '../utils/audio';
import InteractiveChart from '../components/InteractiveChart';
import StepGuideSidebar from '../components/StepGuideSidebar';
import BalanceSheetViz from '../components/BalanceSheetViz';
import {
  Volume2, VolumeX, RotateCcw, AlertOctagon,
  Settings, BookOpen, Sliders, ArrowRight, HelpCircle,
} from 'lucide-react';

interface Props {
  mode: SimulatorMode;
  multimediaMode: MultimediaMode;
}

export default function SimulatorPage({ mode, multimediaMode }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hadMarginCall, setHadMarginCall] = useState(false);

  const [buyParams, setBuyParams] = useState<MarginBuyParams>({
    symbol: '', shares: 1000, initialPrice: 100,
    imr: 0.50, mmr: 0.40, extraCash: 0, simulatedPrice: 100,
  });
  const [shortParams, setShortParams] = useState<ShortSaleParams>({
    symbol: '', shares: 1000, initialPrice: 100,
    imr: 0.50, mmr: 0.40, simulatedPrice: 100,
  });

  useEffect(() => {
    setStep(1);
    soundSynthesizer.stopAlarm();
    setHadMarginCall(false);
  }, [mode]);

  const calculatedBuy = useMemo<CalculatedBuyState>(() => {
    const itemMarketValue = buyParams.shares * buyParams.simulatedPrice;
    const initialTotalValue = buyParams.shares * buyParams.initialPrice;
    const loanAmount = initialTotalValue * (1 - buyParams.imr);
    const equity = itemMarketValue - loanAmount + buyParams.extraCash;
    const marginRatio = itemMarketValue > 0 ? equity / itemMarketValue : 0;
    const marginCallValue = (loanAmount - buyParams.extraCash) / (1 - buyParams.mmr);
    const marginCallPrice = buyParams.shares > 0 ? marginCallValue / buyParams.shares : 0;
    return { itemMarketValue, loanAmount, equity, marginRatio, marginCallPrice, isMarginCall: buyParams.simulatedPrice <= marginCallPrice };
  }, [buyParams]);

  const calculatedShort = useMemo<CalculatedShortState>(() => {
    const itemMarketValue = shortParams.shares * shortParams.simulatedPrice;
    const initialTotalValue = shortParams.shares * shortParams.initialPrice;
    const totalMarginBalance = initialTotalValue * (1 + shortParams.imr);
    const equity = totalMarginBalance - itemMarketValue;
    const marginRatio = itemMarketValue > 0 ? equity / itemMarketValue : 0;
    const marginCallValue = totalMarginBalance / (1 + shortParams.mmr);
    const marginCallPrice = shortParams.shares > 0 ? marginCallValue / shortParams.shares : 0;
    return { itemMarketValue, totalMarginBalance, equity, marginRatio, marginCallPrice, isMarginCall: shortParams.simulatedPrice >= marginCallPrice };
  }, [shortParams]);

  const isBuy = mode === 'MARGIN_BUY';
  const activeMarginCall = isBuy ? calculatedBuy.isMarginCall : calculatedShort.isMarginCall;
  const activeMarginCallPrice = isBuy ? calculatedBuy.marginCallPrice : calculatedShort.marginCallPrice;

  const stepNarrationText = useMemo(() => {
    if (isBuy) {
      if (step === 1) return `融資就是向券商借錢買股票，放大投資部位。你出一半，券商借一半，等於兩倍槓桿。股票市值等於借款加上帳戶權益。股價跌，借款固定不變，虧的全是你的帳戶權益。維持保證金比率，也叫 MMR，是帳戶權益除以股票市值的最低底線，預設百分之四十。跌破 MMR 就追繳，補不上就斷頭。`;
      return `向左拖動滑桿，模擬股價下跌。藍色借款固定，綠色帳戶權益不斷縮水。槓桿風險就在這裡：虧損全是你的，借款一分不少。保證金成數跌破維持比率，追繳警報啟動。追繳後要補現金、賣股減倉，否則券商強制斷頭。試試把滑桿拉到最左邊。`;
    }
    if (step === 1) return `融券就是借股票賣出，等股價跌再買回歸還，賺取差價。賣股所得加上你的保證金，是總保證金帳戶餘額，這個數字固定。融券權益等於總餘額減去回補市值。股價漲，回補成本增加，融券權益縮水。維持保證金比率跌破就追繳。放空最大虧損理論上無限，因為股價沒有天花板。`;
    return `向右拖動滑桿，模擬股價上漲，也就是軋空走勢。橘色回補成本不斷擴大，把綠色融券權益往角落擠。帳戶餘額固定，股價每漲一點，損失就多一點。保證金成數跌破維持比率，追繳警報啟動。追繳後必須立刻補現金或買回股票，否則被強制平倉。把滑桿推到最右邊，感受軋空的壓力。`;
  }, [isBuy, step]);

  const warningNarration = useMemo(() => isBuy
    ? `緊急警報！融資追繳已觸發！當前股價已跌破臨界限額 ${calculatedBuy.marginCallPrice.toFixed(1)} 元。帳戶保證金成數已跌破維持比率。請立刻採取行動：補交保證金，或賣出持股減少借款，否則將面臨強制斷頭！`
    : `緊急警報！融券追繳已觸發！當前股價已突破回補臨界線 ${calculatedShort.marginCallPrice.toFixed(1)} 元。融券保證金比率已跌破維持要求。請立刻補交資金或買回股票回補，否則券商將強制代為平倉！`,
  [isBuy, calculatedBuy.marginCallPrice, calculatedShort.marginCallPrice]);

  const audioEnabled = multimediaMode !== 'TEXT_CHART' && !isAudioMuted;

  // Pre-fetch audio in background when step/mode changes — no auto-play
  useEffect(() => { soundSynthesizer.prefetch(stepNarrationText); }, [stepNarrationText]);
  useEffect(() => { soundSynthesizer.setMute(isAudioMuted); }, [isAudioMuted]);
  useEffect(() => {
    if (activeMarginCall) {
      soundSynthesizer.startAlarm(); // startAlarm stops any narration first
      if (!hadMarginCall) setHadMarginCall(true);
    } else {
      soundSynthesizer.stopAlarm();
      setHadMarginCall(false);
    }
    return () => { soundSynthesizer.stopAlarm(); };
  }, [activeMarginCall]);

  const resetParams = () => {
    if (isBuy) setBuyParams({ symbol: '', shares: 1000, initialPrice: 100, imr: 0.50, mmr: 0.40, extraCash: 0, simulatedPrice: 100 });
    else setShortParams({ symbol: '', shares: 1000, initialPrice: 100, imr: 0.50, mmr: 0.40, simulatedPrice: 100 });
    setHadMarginCall(false);
    soundSynthesizer.stopAlarm();
  };

  // ─── shared input class ───
  const inp = 'w-full h-9 px-3 border border-[#27272A] rounded-xl text-xs font-mono bg-[#09090B] text-[#FAFAFA] focus:ring-1 focus:ring-[#22C55E] outline-none';

  return (
    <div className="flex-1 overflow-hidden relative">
      {/* Strobe overlay — always mounted, opacity driven by activeMarginCall to avoid exit-flash */}
      <motion.div
        animate={activeMarginCall && step === 2 ? { opacity: [0, 0.1, 0] } : { opacity: 0 }}
        transition={activeMarginCall && step === 2
          ? { repeat: Infinity, duration: 1.2, ease: 'easeInOut' }
          : { duration: 0.15 }}
        className="fixed inset-0 bg-red-600 pointer-events-none z-50"
      />

      <div className="h-full max-w-7xl mx-auto px-4 py-4 grid grid-cols-12 gap-4">

        {/* ══ LEFT: Params (3 cols) ══ */}
        <div className="col-span-3 flex flex-col gap-3 overflow-hidden">

          {/* Toolbar: mute + reset only */}
          <div className="shrink-0 flex gap-2 items-center">
            <button onClick={() => setIsAudioMuted(!isAudioMuted)}
              className={`p-2 rounded-xl border transition cursor-pointer ${isAudioMuted ? 'bg-rose-950/40 border-rose-800 text-rose-500' : 'bg-[#18181B] border-[#27272A] text-[#FAFAFA] hover:bg-[#27272A]'}`}>
              {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button onClick={resetParams}
              className="flex items-center gap-1 px-3 py-2 text-[10px] font-semibold border border-[#27272A] rounded-xl bg-[#18181B] text-[#FAFAFA] hover:bg-[#27272A] transition cursor-pointer">
              <RotateCcw className="w-3 h-3" /> 重置
            </button>
          </div>

          {/* Params panel */}
          <div className="flex-1 bg-[#18181B] border border-[#27272A] rounded-2xl p-4 flex flex-col gap-3 overflow-y-auto">
            <div className="flex items-center gap-1.5 pb-2 border-b border-[#27272A] shrink-0">
              <Settings className="w-3.5 h-3.5 text-[#A1A1AA]" />
              <span className="font-bold text-[#FAFAFA] text-xs">參數設定</span>
              <span className="ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#09090B] border border-[#27272A] text-[#A1A1AA]">IMR 50%</span>
            </div>

            {isBuy ? (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">交易股數</label>
                  <input type="number" step="100" min="10" value={buyParams.shares}
                    onChange={(e) => setBuyParams({ ...buyParams, shares: parseInt(e.target.value) || 0 })}
                    className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">買入初始單價</label>
                  <input type="number" step="1" min="1" value={buyParams.initialPrice}
                    onChange={(e) => { const v = parseFloat(e.target.value) || 0; setBuyParams({ ...buyParams, initialPrice: v, simulatedPrice: v }); }}
                    className={`${inp} text-[#22C55E] font-bold`} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-semibold text-[#A1A1AA]">維持保證金 MMR</span>
                    <span className="font-bold text-[#22C55E]">{(buyParams.mmr * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.25" max="0.48" step="0.01" value={buyParams.mmr}
                    onChange={(e) => setBuyParams({ ...buyParams, mmr: parseFloat(e.target.value) })}
                    className="w-full accent-[#22C55E] cursor-pointer h-2 bg-[#27272A] rounded-lg" />
                  <div className="flex justify-between text-[10px] text-[#52525B] mt-0.5">
                    <span>25%</span><span>48%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">額外現金補注</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-3 flex items-center text-[#A1A1AA] text-[10px] pointer-events-none">$</span>
                    <input type="number" step="500" min="0" value={buyParams.extraCash}
                      onChange={(e) => setBuyParams({ ...buyParams, extraCash: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className={`${inp} pl-6`} />
                  </div>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">交易股數</label>
                  <input type="number" step="100" min="10" value={shortParams.shares}
                    onChange={(e) => setShortParams({ ...shortParams, shares: parseInt(e.target.value) || 0 })}
                    className={inp} />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">融券放空單價</label>
                  <input type="number" step="1" min="1" value={shortParams.initialPrice}
                    onChange={(e) => { const v = parseFloat(e.target.value) || 0; setShortParams({ ...shortParams, initialPrice: v, simulatedPrice: v }); }}
                    className={`${inp} text-[#22C55E] font-bold`} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="font-semibold text-[#A1A1AA]">維持保證金 MMR</span>
                    <span className="font-bold text-[#22C55E]">{(shortParams.mmr * 100).toFixed(0)}%</span>
                  </div>
                  <input type="range" min="0.25" max="0.50" step="0.01" value={shortParams.mmr}
                    onChange={(e) => setShortParams({ ...shortParams, mmr: parseFloat(e.target.value) })}
                    className="w-full accent-[#22C55E] cursor-pointer h-2 bg-[#27272A] rounded-lg" />
                  <div className="flex justify-between text-[10px] text-[#52525B] mt-0.5">
                    <span>25%</span><span>50%</span>
                  </div>
                </div>
              </>
            )}

            {/* Summary mini-card */}
            <div className="mt-auto pt-3 border-t border-[#27272A] shrink-0 flex flex-col gap-2">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#A1A1AA]">初始總市值</span>
                <span className="font-mono font-bold text-[#FAFAFA]">
                  ${((isBuy ? buyParams.shares * buyParams.initialPrice : shortParams.shares * shortParams.initialPrice)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-[10px]">
                <span className="text-[#A1A1AA]">追繳臨界價</span>
                <span className="font-mono font-bold text-rose-400">
                  ${activeMarginCallPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ══ CENTER: Simulation (6 cols) ══ */}
        <div className="col-span-6 flex flex-col gap-3 overflow-hidden">

          {/* Step pager */}
          <div className="shrink-0 flex bg-[#18181B] border border-[#27272A] rounded-xl p-1 w-fit">
            <button onClick={() => { setStep(1); soundSynthesizer.stopAlarm(); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${step === 1 ? 'bg-[#FAFAFA] text-slate-950 shadow' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}>
              <BookOpen className="w-3.5 h-3.5" /> 第一步：概念與預算
            </button>
            <button onClick={() => setStep(2)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${step === 2 ? 'bg-[#FAFAFA] text-slate-950 shadow' : 'text-[#A1A1AA] hover:text-[#FAFAFA]'}`}>
              <Sliders className="w-3.5 h-3.5" /> 第二步：沙盒模擬
            </button>
          </div>

          {/* Step content */}
          <div className="flex-1 min-h-0 overflow-hidden">

            {step === 1 ? (
              /* ── STEP 1: Account matrix ── */
              <div className="h-full bg-[#18181B] border border-[#27272A] rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2 shrink-0">
                  <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
                  <h3 className="font-semibold text-[#FAFAFA] text-sm">資金結構 Account Matrix</h3>
                </div>

                {isBuy ? (
                  <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
                    <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
                      <div className="text-[10px] text-[#A1A1AA] mb-1">股票初始總市值</div>
                      <div className="text-xl font-mono font-black text-[#FAFAFA]">${(buyParams.shares * buyParams.initialPrice).toLocaleString()}</div>
                      <div className="text-[10px] text-[#A1A1AA]">{buyParams.shares.toLocaleString()} 股 × ${buyParams.initialPrice}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A]">
                        <div className="text-[10px] text-[#22C55E] font-bold mb-1">自備款 (Cash)</div>
                        <div className="text-sm font-bold font-mono text-[#FAFAFA]">${((buyParams.shares * buyParams.initialPrice) * 0.5).toLocaleString()}</div>
                        <div className="text-[9px] text-[#A1A1AA]">50% IMR</div>
                      </div>
                      <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A]">
                        <div className="text-[10px] text-blue-400 font-bold mb-1">借款金額 (Loan)</div>
                        <div className="text-sm font-bold font-mono text-[#FAFAFA]">${((buyParams.shares * buyParams.initialPrice) * 0.5).toLocaleString()}</div>
                        <div className="text-[9px] text-[#A1A1AA]">50% 融資</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden flex">
                      <div className="bg-[#22C55E] h-full w-1/2" />
                      <div className="bg-blue-500 h-full w-1/2" />
                    </div>
                    {buyParams.extraCash > 0 && (
                      <div className="bg-[#09090B] p-3 rounded-xl border border-indigo-500/30 flex justify-between text-xs">
                        <span className="text-[#A1A1AA]">額外補注現金</span>
                        <span className="font-mono font-bold text-indigo-400">+${buyParams.extraCash.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-[10px] text-[#A1A1AA] leading-relaxed">
                      <span className="font-bold text-[#FAFAFA] flex items-center gap-1 mb-1">
                        <HelpCircle className="w-3 h-3 text-[#22C55E]" /> 為什麼要 MMR？
                      </span>
                      交易所規定的維持保證金比率（MMR）是保護經紀商免於倒債的安全底線。股價下跌時，借款固定、權益縮水，一旦比率跌破 MMR 即觸發追繳。
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 flex-1 min-h-0 overflow-y-auto">
                    <div className="bg-[#09090B] p-4 rounded-xl border border-[#27272A]">
                      <div className="text-[10px] text-[#A1A1AA] mb-1">賣出借入股票總得額</div>
                      <div className="text-xl font-mono font-black text-[#FAFAFA]">${(shortParams.shares * shortParams.initialPrice).toLocaleString()}</div>
                      <div className="text-[10px] text-[#A1A1AA]">{shortParams.shares.toLocaleString()} 股 × ${shortParams.initialPrice}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A]">
                        <div className="text-[10px] text-[#22C55E] font-bold mb-1">自籌保證金</div>
                        <div className="text-sm font-bold font-mono text-[#FAFAFA]">${((shortParams.shares * shortParams.initialPrice) * 0.5).toLocaleString()}</div>
                        <div className="text-[9px] text-[#A1A1AA]">50% IMR</div>
                      </div>
                      <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A]">
                        <div className="text-[10px] text-[#A1A1AA] font-semibold mb-1">融券所得</div>
                        <div className="text-sm font-bold font-mono text-[#FAFAFA]">${(shortParams.shares * shortParams.initialPrice).toLocaleString()}</div>
                        <div className="text-[9px] text-[#A1A1AA]">存留經紀商</div>
                      </div>
                    </div>
                    <div className="bg-[#09090B] p-3 rounded-xl border border-indigo-500/30 flex justify-between items-center">
                      <div>
                        <div className="text-[10px] text-[#A1A1AA] font-bold">總保證金餘額</div>
                        <div className="text-base font-mono font-black text-[#FAFAFA]">${((shortParams.shares * shortParams.initialPrice) * 1.5).toLocaleString()}</div>
                      </div>
                      <div className="text-[9px] text-[#A1A1AA] text-right leading-relaxed">放空所得<br />+ 自備保證金</div>
                    </div>
                    <div className="p-3 bg-[#09090B] border border-[#27272A] rounded-xl text-[10px] text-[#A1A1AA] leading-relaxed">
                      <span className="font-bold text-[#FAFAFA] flex items-center gap-1 mb-1">
                        <HelpCircle className="w-3 h-3 text-[#22C55E]" /> 軋空的風險
                      </span>
                      股價暴漲時，回補市值激增、融券權益快速蒸發。一旦比率低於 MMR，將面臨強制追繳甚至代為回補（斷頭）。
                    </div>
                  </div>
                )}

                <button onClick={() => setStep(2)}
                  className="shrink-0 w-full h-10 bg-[#22C55E] hover:bg-[#16a34a] text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer">
                  開啟動態沙盒模擬 <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

            ) : (
              /* ── STEP 2: Sandbox simulation ── */
              <div className="h-full flex flex-col gap-3">

                {/* Margin call alert */}
                <AnimatePresence>
                  {activeMarginCall && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="shrink-0 p-3 rounded-2xl bg-red-950/40 border border-red-500/50 flex items-center gap-3">
                      <div className="p-2 bg-rose-600 text-white rounded-xl animate-bounce shrink-0">
                        <AlertOctagon className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-black text-rose-400">
                          🚨 {isBuy ? '融資追繳警告 (Margin Call)' : '融券追繳警告 (Short Squeeze)'}
                        </div>
                        <p className="text-[10px] text-rose-300 mt-0.5 font-semibold truncate">
                          {isBuy
                            ? `股價 $${buyParams.simulatedPrice.toFixed(2)} 跌破 $${calculatedBuy.marginCallPrice.toFixed(2)}，成數 ${(calculatedBuy.marginRatio * 100).toFixed(1)}% < MMR`
                            : `股價 $${shortParams.simulatedPrice.toFixed(2)} 突破 $${calculatedShort.marginCallPrice.toFixed(2)}，成數 ${(calculatedShort.marginRatio * 100).toFixed(1)}% < MMR`}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          if (isBuy) setBuyParams({ ...buyParams, simulatedPrice: buyParams.initialPrice });
                          else setShortParams({ ...shortParams, simulatedPrice: shortParams.initialPrice });
                          soundSynthesizer.stopAlarm();
                        }}
                        className="shrink-0 px-2.5 py-1.5 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl cursor-pointer">
                        恢補
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Balance sheet visualization — replaces old stats bento */}
                <div className="shrink-0">
                  <BalanceSheetViz
                    mode={mode}
                    itemMarketValue={isBuy ? calculatedBuy.itemMarketValue : calculatedShort.itemMarketValue}
                    loanAmount={calculatedBuy.loanAmount}
                    totalMarginBalance={calculatedShort.totalMarginBalance}
                    equity={isBuy ? calculatedBuy.equity : calculatedShort.equity}
                    mmr={isBuy ? buyParams.mmr : shortParams.mmr}
                    marginRatio={isBuy ? calculatedBuy.marginRatio : calculatedShort.marginRatio}
                    isMarginCall={activeMarginCall}
                    simulatedPrice={isBuy ? buyParams.simulatedPrice : shortParams.simulatedPrice}
                    initialPrice={isBuy ? buyParams.initialPrice : shortParams.initialPrice}
                  />
                </div>

                {/* Slider */}
                <div className="shrink-0 bg-[#18181B] border border-[#27272A] rounded-2xl px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-[10px] text-[#A1A1AA]">
                    <span className="font-semibold flex items-center gap-1"><Sliders className="w-3 h-3 text-[#22C55E]" /> 模擬股價滑桿</span>
                    <span className="font-mono text-rose-400 font-bold">追繳臨界 ${activeMarginCallPrice.toFixed(2)}</span>
                  </div>
                  {isBuy ? (
                    <>
                      <input type="range" min={buyParams.initialPrice * 0.2} max={buyParams.initialPrice * 2.0} step="0.5"
                        value={buyParams.simulatedPrice}
                        onChange={(e) => setBuyParams({ ...buyParams, simulatedPrice: parseFloat(e.target.value) })}
                        className="w-full h-2.5 bg-[#09090B] border border-[#27272A] rounded-lg appearance-none cursor-pointer accent-[#22C55E]" />
                      <div className="flex justify-between text-[9px] font-mono text-[#52525B]">
                        <span className="text-rose-400/70">◀ 危險 ${(buyParams.initialPrice * 0.2).toFixed(0)}</span>
                        <span className="text-[#22C55E] font-bold">${buyParams.simulatedPrice.toFixed(1)}</span>
                        <span>${(buyParams.initialPrice * 2.0).toFixed(0)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <input type="range" min={shortParams.initialPrice * 0.2} max={shortParams.initialPrice * 2.0} step="0.5"
                        value={shortParams.simulatedPrice}
                        onChange={(e) => setShortParams({ ...shortParams, simulatedPrice: parseFloat(e.target.value) })}
                        className="w-full h-2.5 bg-[#09090B] border border-[#27272A] rounded-lg appearance-none cursor-pointer accent-[#22C55E]" />
                      <div className="flex justify-between text-[9px] font-mono text-[#52525B]">
                        <span>${(shortParams.initialPrice * 0.2).toFixed(0)}</span>
                        <span className="text-[#22C55E] font-bold">${shortParams.simulatedPrice.toFixed(1)}</span>
                        <span className="text-rose-400/70">${(shortParams.initialPrice * 2.0).toFixed(0)} 危險 ▶</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Chart — fills remaining height */}
                <div className="flex-1 min-h-0">
                  <InteractiveChart
                    mode={mode}
                    initialPrice={isBuy ? buyParams.initialPrice : shortParams.initialPrice}
                    simulatedPrice={isBuy ? buyParams.simulatedPrice : shortParams.simulatedPrice}
                    marginCallPrice={activeMarginCallPrice}
                    isMarginCall={activeMarginCall}
                  />
                </div>

              </div>
            )}
          </div>
        </div>

        {/* ══ RIGHT: Step guide sidebar (3 cols) ══ */}
        <div className="col-span-3 overflow-hidden">
          <StepGuideSidebar
            mode={mode}
            step={step}
            multimediaMode={multimediaMode}
            onSpeak={() => soundSynthesizer.playNarration(stepNarrationText)}
          />
        </div>

      </div>
    </div>
  );
}
