import React from 'react';
import { SimulatorMode } from '../types';

interface Props {
  mode: SimulatorMode;
  // buy: asset = market value (dynamic), liability = loan (fixed)
  // short: asset = margin balance (fixed), liability = repurchase cost (dynamic)
  itemMarketValue: number;
  loanAmount: number;
  totalMarginBalance: number;
  equity: number;
  mmr: number;
  marginRatio: number;
  isMarginCall: boolean;
  simulatedPrice: number;
  initialPrice: number;
}

export default function BalanceSheetViz({
  mode, itemMarketValue, loanAmount, totalMarginBalance,
  equity, mmr, marginRatio, isMarginCall, simulatedPrice, initialPrice,
}: Props) {
  const isBuy = mode === 'MARGIN_BUY';

  // Asset-Liability-Equity values
  const assetValue  = isBuy ? itemMarketValue   : totalMarginBalance;
  const liabValue   = isBuy ? loanAmount        : itemMarketValue;      // buy: loan; short: repurchase cost
  const equityValue = equity;

  // Bar percentages (liability + equity = 100% of asset reference)
  const liabPct   = Math.min((liabValue  / assetValue) * 100, 100);
  const equityPct = Math.max((equityValue / assetValue) * 100, 0);
  const safeEquity = equityValue > 0;

  // MMR threshold line position (from left, as % of bar)
  //   buy:   margin call when equity/marketValue < mmr  → threshold at (1-mmr)*100%
  //   short: margin call when equity/repurchaseCost < mmr → threshold at 1/(1+mmr)*100%
  const thresholdPct = isBuy ? (1 - mmr) * 100 : (1 / (1 + mmr)) * 100;
  const ratioOK = marginRatio >= mmr;

  const priceChange = ((simulatedPrice - initialPrice) / initialPrice) * 100;
  const priceUp = simulatedPrice >= initialPrice;

  return (
    <div className={`rounded-2xl border p-4 flex flex-col gap-3 transition-colors duration-300 ${isMarginCall ? 'bg-rose-950/20 border-rose-800/50' : 'bg-[#18181B] border-[#27272A]'}`}>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-[#FAFAFA]">
          {isBuy ? '融資 資產負債比例' : '融券 保證金比例'}
          <span className="ml-1 text-[10px] font-normal text-[#52525B]">Balance Sheet</span>
        </span>
        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg border transition-all ${ratioOK ? 'bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20' : 'bg-rose-950/50 text-rose-400 border-rose-800 animate-pulse'}`}>
          成數 {(marginRatio * 100).toFixed(1)}% {ratioOK ? '≥' : '<'} MMR {(mmr * 100).toFixed(0)}%
        </span>
      </div>

      {/* ── Accounting equation: Assets = Liabilities + Equity ── */}
      <div className="grid grid-cols-5 gap-2 items-stretch">

        {/* Assets box */}
        <div className="col-span-2 bg-[#09090B] rounded-xl p-2.5 border border-[#27272A] flex flex-col justify-between">
          <div className="text-[9px] text-[#A1A1AA] font-bold uppercase tracking-wide">
            資產 Assets
          </div>
          <div>
            <div className="font-mono font-black text-sm text-[#FAFAFA] mt-1">${(assetValue / 1000).toFixed(1)}K</div>
            <div className={`text-[9px] font-semibold mt-0.5 ${isBuy ? (priceUp ? 'text-[#22C55E]' : 'text-rose-400') : 'text-[#52525B]'}`}>
              {isBuy
                ? `股票市值 ${priceUp ? '▲' : '▼'} ${Math.abs(priceChange).toFixed(1)}%`
                : '保證金餘額（固定）'}
            </div>
          </div>
        </div>

        {/* = sign */}
        <div className="col-span-1 flex items-center justify-center text-[#3f3f46] font-bold text-xl">=</div>

        {/* Liabilities + Equity */}
        <div className="col-span-2 flex flex-col gap-1.5">
          {/* Liability */}
          <div className={`rounded-lg p-2 border ${isBuy ? 'bg-blue-950/30 border-blue-800/30' : 'bg-orange-950/30 border-orange-900/40'}`}>
            <div className={`text-[9px] font-bold ${isBuy ? 'text-blue-400' : 'text-orange-400'}`}>
              {isBuy ? '借款 Loan（固定）' : '回補成本 Cost（動態）'}
            </div>
            <div className={`font-mono font-black text-xs mt-0.5 ${isBuy ? 'text-blue-300' : 'text-orange-300'}`}>
              ${(liabValue / 1000).toFixed(1)}K
            </div>
          </div>

          {/* Equity */}
          <div className={`rounded-lg p-2 border ${!safeEquity ? 'bg-rose-950/30 border-rose-800/30' : ratioOK ? 'bg-[#22C55E]/5 border-[#22C55E]/20' : 'bg-yellow-950/20 border-yellow-800/30'}`}>
            <div className={`text-[9px] font-bold ${!safeEquity ? 'text-rose-400' : 'text-[#22C55E]'}`}>
              權益 Equity
            </div>
            <div className={`font-mono font-black text-xs mt-0.5 ${!safeEquity ? 'text-rose-400' : ratioOK ? 'text-[#FAFAFA]' : 'text-yellow-400'}`}>
              {!safeEquity ? '−' : ''}${(Math.abs(equityValue) / 1000).toFixed(1)}K
            </div>
          </div>
        </div>
      </div>

      {/* ── Proportion bar ── */}
      <div>
        {/* Danger direction labels */}
        <div className="flex justify-between text-[9px] font-mono mb-1">
          <span className={`font-bold ${isBuy ? 'text-rose-400/80' : 'text-[#27272A]'}`}>
            {isBuy ? '◀ 股價下跌 = 危險' : ''}
          </span>
          <span className={`font-bold ${!isBuy ? 'text-rose-400/80' : 'text-[#27272A]'}`}>
            {!isBuy ? '股價上漲 = 危險 ▶' : ''}
          </span>
        </div>

        {/* Bar track */}
        <div className="relative h-6 w-full bg-[#09090B] border border-[#27272A] rounded-lg overflow-visible">

          {/* Filled segments */}
          <div className="absolute inset-0 rounded-lg overflow-hidden flex">
            {/* Liability segment */}
            <div
              className={`h-full transition-all duration-300 ease-out ${isBuy ? 'bg-blue-600/75' : 'bg-orange-500/75'}`}
              style={{ width: `${liabPct}%` }}
            />
            {/* Equity segment */}
            <div
              className={`h-full transition-all duration-300 ease-out ${!safeEquity ? 'bg-rose-600/75' : ratioOK ? 'bg-[#22C55E]/75' : 'bg-yellow-500/75'}`}
              style={{ width: `${equityPct}%` }}
            />
          </div>

          {/* MMR threshold vertical line */}
          <div
            className="absolute top-[-8px] bottom-[-4px] w-px bg-rose-400/90 z-10 pointer-events-none"
            style={{ left: `calc(${thresholdPct}% - 0.5px)` }}
          />
          <div
            className="absolute text-[8px] text-rose-400 font-bold whitespace-nowrap z-20 pointer-events-none"
            style={{ left: `${thresholdPct}%`, top: '-18px', transform: 'translateX(-50%)' }}
          >
            MMR
          </div>
        </div>

        {/* Pct labels below */}
        <div className="flex justify-between mt-1 px-0.5 text-[9px] font-mono">
          <span className={isBuy ? 'text-blue-400' : 'text-orange-400'}>
            {isBuy ? 'Loan' : 'Cost'} {liabPct.toFixed(1)}%
          </span>
          <span className={!safeEquity ? 'text-rose-400' : ratioOK ? 'text-[#22C55E]' : 'text-yellow-400'}>
            Equity {equityPct.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
