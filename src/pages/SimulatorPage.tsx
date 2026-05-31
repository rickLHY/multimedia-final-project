import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SimulatorMode, MultimediaMode,
  MarginBuyParams, ShortSaleParams,
  CalculatedBuyState, CalculatedShortState,
} from '../types';
import { soundSynthesizer } from '../utils/audio';
import InteractiveChart from '../components/InteractiveChart';
import StepGuideSidebar, { GUIDE } from '../components/StepGuideSidebar';
import BalanceSheetViz from '../components/BalanceSheetViz';
import {
  Volume2, VolumeX, RotateCcw, AlertOctagon,
  Settings, BookOpen, Sliders, ArrowRight,
} from 'lucide-react';

interface Props {
  mode: SimulatorMode;
  multimediaMode: MultimediaMode;
}

export default function SimulatorPage({ mode, multimediaMode }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [hadMarginCall, setHadMarginCall] = useState(false);
  const [isSpeakLoading, setIsSpeakLoading] = useState(false);

  const defaultBuy: MarginBuyParams = {
    symbol: '', shares: 1000, initialPrice: 100,
    imr: 0.50, mmr: 0.40, extraCash: 0, simulatedPrice: 100,
    annualRate: 0.065, daysHeld: 0, dividendPerShare: 0,
  };
  const defaultShort: ShortSaleParams = {
    symbol: '', shares: 1000, initialPrice: 100,
    imr: 0.50, mmr: 0.40, simulatedPrice: 100,
    annualBorrowRate: 0.03, daysShorted: 0, dividendPerShare: 0,
  };

  const [buyParams, setBuyParams] = useState<MarginBuyParams>(defaultBuy);
  const [shortParams, setShortParams] = useState<ShortSaleParams>(defaultShort);

  useEffect(() => {
    setStep(1);
    soundSynthesizer.stopAlarm();
    setHadMarginCall(false);
  }, [mode]);

  const calculatedBuy = useMemo<CalculatedBuyState>(() => {
    const itemMarketValue = buyParams.shares * buyParams.simulatedPrice;
    const initialTotalValue = buyParams.shares * buyParams.initialPrice;
    const loanAmount = initialTotalValue * (1 - buyParams.imr);
    // Interest accrued on loan
    const accruedInterest = loanAmount * buyParams.annualRate / 365 * buyParams.daysHeld;
    // Cash dividends received while holding
    const dividendIncome = buyParams.shares * buyParams.dividendPerShare;
    const equity = itemMarketValue - loanAmount + buyParams.extraCash + dividendIncome - accruedInterest;
    const marginRatio = itemMarketValue > 0 ? equity / itemMarketValue : 0;
    // Margin call when equity/marketValue < mmr
    // → marketValue = (loan - extraCash - dividendIncome + accruedInterest) / (1 - mmr)
    const netLiability = loanAmount - buyParams.extraCash - dividendIncome + accruedInterest;
    const marginCallValue = netLiability / (1 - buyParams.mmr);
    const marginCallPrice = buyParams.shares > 0 ? marginCallValue / buyParams.shares : 0;
    return { itemMarketValue, loanAmount, equity, marginRatio, marginCallPrice, accruedInterest, dividendIncome, isMarginCall: buyParams.simulatedPrice <= marginCallPrice };
  }, [buyParams]);

  const calculatedShort = useMemo<CalculatedShortState>(() => {
    const itemMarketValue = shortParams.shares * shortParams.simulatedPrice;
    const initialTotalValue = shortParams.shares * shortParams.initialPrice;
    const totalMarginBalance = initialTotalValue * (1 + shortParams.imr);
    // Borrowing fee on initial short value
    const borrowingFee = initialTotalValue * shortParams.annualBorrowRate / 365 * shortParams.daysShorted;
    // Dividend owed to stock lender
    const dividendOwed = shortParams.shares * shortParams.dividendPerShare;
    const equity = totalMarginBalance - itemMarketValue - dividendOwed - borrowingFee;
    const marginRatio = itemMarketValue > 0 ? equity / itemMarketValue : 0;
    // Margin call when equity/itemMarketValue < mmr
    // → itemMarketValue = (totalMarginBalance - dividendOwed - borrowingFee) / (1 + mmr)
    const adjustedBalance = totalMarginBalance - dividendOwed - borrowingFee;
    const marginCallValue = adjustedBalance / (1 + shortParams.mmr);
    const marginCallPrice = shortParams.shares > 0 ? marginCallValue / shortParams.shares : 0;
    return { itemMarketValue, totalMarginBalance, equity, marginRatio, marginCallPrice, borrowingFee, dividendOwed, isMarginCall: shortParams.simulatedPrice >= marginCallPrice };
  }, [shortParams]);

  const isBuy = mode === 'MARGIN_BUY';
  const activeMarginCall = isBuy ? calculatedBuy.isMarginCall : calculatedShort.isMarginCall;
  const activeMarginCallPrice = isBuy ? calculatedBuy.marginCallPrice : calculatedShort.marginCallPrice;

  // Derive narration text from the same GUIDE content shown in the sidebar
  const stepNarrationText = useMemo(() => {
    const g = GUIDE[mode][step];
    const nums = ['一', '二', '三', '四', '五', '六'];
    const stepsText = g.steps.map((s, i) => `第${nums[i]}，${s}`).join('。');
    return `${g.title}。${g.description}。操作步驟：${stepsText}。`;
  }, [mode, step]);

  // Wire up loading callback for the play button
  useEffect(() => {
    soundSynthesizer.onLoadingChange = setIsSpeakLoading;
    return () => { soundSynthesizer.onLoadingChange = null; };
  }, []);

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
    if (isBuy) setBuyParams(defaultBuy);
    else setShortParams(defaultShort);
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

                {/* Interest & Dividend */}
                <div className="pt-2 border-t border-[#27272A] flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">利息 ＆ 股利</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">
                        融資年利率 <span className="text-[#22C55E]">{(buyParams.annualRate * 100).toFixed(1)}%</span>
                      </label>
                      <input type="range" min="0.01" max="0.15" step="0.001" value={buyParams.annualRate}
                        onChange={(e) => setBuyParams({ ...buyParams, annualRate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-2 bg-[#27272A] rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">持有天數</label>
                      <input type="number" step="1" min="0" max="365" value={buyParams.daysHeld}
                        onChange={(e) => setBuyParams({ ...buyParams, daysHeld: Math.max(0, parseInt(e.target.value) || 0) })}
                        className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">每股現金股利 $</label>
                    <input type="number" step="0.1" min="0" value={buyParams.dividendPerShare}
                      onChange={(e) => setBuyParams({ ...buyParams, dividendPerShare: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className={`${inp} text-amber-400`} />
                  </div>
                  {/* 突發事件按鈕：時間推進 30 天 */}
                  <button
                    onClick={() => setBuyParams(p => ({ ...p, daysHeld: p.daysHeld + 30 }))}
                    className="w-full h-8 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⏩ 時間推進 +30 天（累積利息）
                  </button>

                  {(calculatedBuy.accruedInterest > 0 || calculatedBuy.dividendIncome > 0) && (
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                      <div className="bg-[#09090B] p-1.5 rounded-lg border border-[#27272A]">
                        <div className="text-rose-400">利息費用</div>
                        <div className="text-[#FAFAFA]">−${calculatedBuy.accruedInterest.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                      <div className="bg-[#09090B] p-1.5 rounded-lg border border-[#27272A]">
                        <div className="text-[#22C55E]">股利收入</div>
                        <div className="text-[#FAFAFA]">+${calculatedBuy.dividendIncome.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                    </div>
                  )}
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

                {/* Borrow fee & Dividend */}
                <div className="pt-2 border-t border-[#27272A] flex flex-col gap-2">
                  <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wide">借券費 ＆ 股利補償</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">
                        借券年費率 <span className="text-[#22C55E]">{(shortParams.annualBorrowRate * 100).toFixed(1)}%</span>
                      </label>
                      <input type="range" min="0.001" max="0.15" step="0.001" value={shortParams.annualBorrowRate}
                        onChange={(e) => setShortParams({ ...shortParams, annualBorrowRate: parseFloat(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-2 bg-[#27272A] rounded-lg" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">放空天數</label>
                      <input type="number" step="1" min="0" max="365" value={shortParams.daysShorted}
                        onChange={(e) => setShortParams({ ...shortParams, daysShorted: Math.max(0, parseInt(e.target.value) || 0) })}
                        className={inp} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#A1A1AA] mb-1">每股股利補償 $</label>
                    <input type="number" step="0.1" min="0" value={shortParams.dividendPerShare}
                      onChange={(e) => setShortParams({ ...shortParams, dividendPerShare: Math.max(0, parseFloat(e.target.value) || 0) })}
                      className={`${inp} text-amber-400`} />
                  </div>

                  {/* 突發事件按鈕：公司發放股利 */}
                  <button
                    onClick={() => setShortParams(p => ({ ...p, dividendPerShare: p.dividendPerShare + 2 }))}
                    className="w-full h-8 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    ⚡ 突發：公司發放 $2 現金股利
                  </button>

                  {(calculatedShort.borrowingFee > 0 || calculatedShort.dividendOwed > 0) && (
                    <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                      <div className="bg-[#09090B] p-1.5 rounded-lg border border-[#27272A]">
                        <div className="text-rose-400">借券費用</div>
                        <div className="text-[#FAFAFA]">−${calculatedShort.borrowingFee.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                      <div className="bg-[#09090B] p-1.5 rounded-lg border border-[#27272A]">
                        <div className="text-rose-400">股利補償</div>
                        <div className="text-[#FAFAFA]">−${calculatedShort.dividendOwed.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Summary + Formulas */}
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

              {/* Formulas — current mode only */}
              <div className="pt-2 border-t border-[#27272A] flex flex-col gap-1.5">
                <span className="text-[9px] font-bold text-[#A1A1AA] uppercase tracking-wide">
                  {isBuy ? '融資公式' : '融券公式'}
                </span>

                {isBuy ? (<>
                  <div className="bg-[#09090B] p-2 rounded-lg border border-[#27272A]">
                    <div className="text-[9px] text-[#A1A1AA]">① 帳戶權益</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">= 市值 − 借款 + 股利 − 利息</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${calculatedBuy.equity >= 0 ? 'text-[#22C55E]' : 'text-rose-400'}`}>
                      = ${calculatedBuy.itemMarketValue.toLocaleString(undefined,{maximumFractionDigits:0})} − ${calculatedBuy.loanAmount.toLocaleString(undefined,{maximumFractionDigits:0})}
                      {calculatedBuy.dividendIncome > 0 && ` +$${calculatedBuy.dividendIncome.toLocaleString(undefined,{maximumFractionDigits:0})}`}
                      {calculatedBuy.accruedInterest > 0 && ` −$${calculatedBuy.accruedInterest.toLocaleString(undefined,{maximumFractionDigits:0})}`}
                      {' '}= ${calculatedBuy.equity.toLocaleString(undefined,{maximumFractionDigits:0})}
                    </div>
                  </div>
                  <div className="bg-[#09090B] p-2 rounded-lg border border-[#27272A]">
                    <div className="text-[9px] text-[#A1A1AA]">② 保證金成數 ≥ MMR</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">= 帳戶權益 ÷ 股票市值</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${calculatedBuy.isMarginCall ? 'text-rose-400' : 'text-[#22C55E]'}`}>
                      = {(calculatedBuy.marginRatio*100).toFixed(1)}% {calculatedBuy.isMarginCall ? '<' : '≥'} {(buyParams.mmr*100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-[#EF4444]/5 p-2 rounded-lg border border-[#EF4444]/20">
                    <div className="text-[9px] text-rose-400">③ 追繳臨界價</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">≤ (借款 − 股利 + 利息) ÷ (1−MMR) ÷ 股數</div>
                    <div className="text-[9px] font-mono text-rose-400 mt-0.5">= ${calculatedBuy.marginCallPrice.toFixed(2)}</div>
                  </div>
                </>) : (<>
                  <div className="bg-[#09090B] p-2 rounded-lg border border-[#27272A]">
                    <div className="text-[9px] text-[#A1A1AA]">① 融券權益</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">= 保證金餘額 − 回補市值 − 股利 − 借券費</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${calculatedShort.equity >= 0 ? 'text-[#22C55E]' : 'text-rose-400'}`}>
                      = ${calculatedShort.totalMarginBalance.toLocaleString(undefined,{maximumFractionDigits:0})} − ${calculatedShort.itemMarketValue.toLocaleString(undefined,{maximumFractionDigits:0})}
                      {calculatedShort.dividendOwed > 0 && ` −$${calculatedShort.dividendOwed.toLocaleString(undefined,{maximumFractionDigits:0})}`}
                      {calculatedShort.borrowingFee > 0 && ` −$${calculatedShort.borrowingFee.toLocaleString(undefined,{maximumFractionDigits:0})}`}
                      {' '}= ${calculatedShort.equity.toLocaleString(undefined,{maximumFractionDigits:0})}
                    </div>
                  </div>
                  <div className="bg-[#09090B] p-2 rounded-lg border border-[#27272A]">
                    <div className="text-[9px] text-[#A1A1AA]">② 保證金成數 ≥ MMR</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">= 融券權益 ÷ 回補市值</div>
                    <div className={`text-[9px] font-mono mt-0.5 ${calculatedShort.isMarginCall ? 'text-rose-400' : 'text-[#22C55E]'}`}>
                      = {(calculatedShort.marginRatio*100).toFixed(1)}% {calculatedShort.isMarginCall ? '<' : '≥'} {(shortParams.mmr*100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="bg-[#EF4444]/5 p-2 rounded-lg border border-[#EF4444]/20">
                    <div className="text-[9px] text-rose-400">③ 追繳臨界價</div>
                    <div className="text-[9px] font-mono text-[#FAFAFA] mt-0.5">≥ (餘額 − 股利 − 借券費) ÷ (1+MMR) ÷ 股數</div>
                    <div className="text-[9px] font-mono text-rose-400 mt-0.5">= ${calculatedShort.marginCallPrice.toFixed(2)}</div>
                  </div>
                </>)}
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
            isLoading={isSpeakLoading}
            onSpeak={() => soundSynthesizer.playNarration(stepNarrationText)}
          />
        </div>

      </div>
    </div>
  );
}
