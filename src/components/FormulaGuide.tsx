import React from 'react';
import { SimulatorMode, CalculatedBuyState, CalculatedShortState, MarginBuyParams, ShortSaleParams } from '../types';
import { Info, AlertTriangle } from 'lucide-react';

interface FormulaGuideProps {
  mode: SimulatorMode;
  buyParams: MarginBuyParams;
  shortParams: ShortSaleParams;
  calculatedBuy: CalculatedBuyState;
  calculatedShort: CalculatedShortState;
}

export default function FormulaGuide({
  mode,
  buyParams,
  shortParams,
  calculatedBuy,
  calculatedShort,
}: FormulaGuideProps) {
  const isBuy = mode === 'MARGIN_BUY';

  return (
    <div className="bg-[#18181B] border border-[#27272A] rounded-3xl p-6 flex flex-col gap-6 text-[#FAFAFA]">
      <div className="flex items-center gap-3 pb-3 border-b border-[#27272A]">
        <div className="p-2 bg-[#22C55E]/10 rounded-lg text-[#22C55E]">
          <Info className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-semibold text-[#FAFAFA] text-lg">計算公式 Logic</h3>
          <p className="text-xs text-[#A1A1AA]">剖析信用交易的核心數學模型與風險指標</p>
        </div>
      </div>

      {isBuy ? (
        <div className="flex flex-col gap-5">
          {/* Formula 1: Equity */}
          <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E] mb-2 uppercase tracking-wide">
              公式 1：帳戶權益 (Equity)
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              帳戶權益 = 股票總市值 - 借款金額 + 額外現金
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1.5">
              代表投資人目前所擁有的真實資產價值。若股票市值跌破借款金額，權益將轉為負值。
            </p>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#18181B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-2 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#A1A1AA]">當前計算:</span>
              <span className="text-[#22C55E]">${calculatedBuy.itemMarketValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>-</span>
              <span className="text-[#EF4444]">${calculatedBuy.loanAmount.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>+</span>
              <span className="text-blue-400">${buyParams.extraCash.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>=</span>
              <span className={`font-semibold ${calculatedBuy.equity >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                ${calculatedBuy.equity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
          </div>

          {/* Formula 2: Margin Call Indicator */}
          <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FB923C]/10 text-[#FB923C] mb-2 uppercase tracking-wide">
              公式 2：追繳觸發邏輯
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              保證金成數 = (帳戶權益 / 股票市值) &le; MMR
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1.5">
              當借款部位成數低於維持保證金比率（預設為 {(buyParams.mmr * 100).toFixed(0)}%）時，經紀商將發出追繳。
            </p>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#18181B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-2 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#A1A1AA]">當前：</span>
              <span>(${calculatedBuy.equity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${calculatedBuy.itemMarketValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) =</span>
              <span className={`font-semibold ${(calculatedBuy.marginRatio <= buyParams.mmr) ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                {(calculatedBuy.marginRatio * 100).toFixed(1)}%
              </span>
              <span className="text-[#A1A1AA]">vs</span>
              <span>門檻 {(buyParams.mmr * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Formula 3: Margin Call Target Price */}
          <div className="bg-[#EF4444]/5 p-4 rounded-2xl border border-[#EF4444]/20">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/10 text-[#F87171] mb-2 uppercase tracking-wide flex items-center w-fit gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 關鍵追繳價門檻公式
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              臨界市值 &le; (借款 - 外現) / (1 - MMR)
            </div>
            <div className="font-mono text-[#A1A1AA] text-xs py-0.5 mt-1">
              臨界追繳價 &le; [ 臨界價值 ] / 股數
            </div>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#09090B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-1 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#EF4444] font-semibold">當前股價觸及臨界點:</span>
              <span className="bg-[#18181B] px-2 py-1 border border-[#27272A] rounded text-[#EF4444] font-bold">
                ${calculatedBuy.marginCallPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#A1A1AA] block w-full mt-1.5">
                * 當模擬股價跌破此價位時，系統即跳出「融資追繳警告」並作警報提示。
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {/* Formula 1: Equity */}
          <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#22C55E]/10 text-[#22C55E] mb-2 uppercase tracking-wide">
              公式 1：融券權益 (Short Equity)
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              融券權益 = 總保證金餘額 - 回補股票市值
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1.5">
              經紀商帳戶包含您賣出股票所得的本金加上您所繳交的初始保證金，再扣除當下回補所需的最新市值。
            </p>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#18181B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-2 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#A1A1AA]">當前計算:</span>
              <span className="text-[#22C55E]">${calculatedShort.totalMarginBalance.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>-</span>
              <span className="text-[#EF4444]">${calculatedShort.itemMarketValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span>=</span>
              <span className={`font-semibold ${calculatedShort.equity >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                ${calculatedShort.equity.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
              </span>
            </div>
          </div>

          {/* Formula 2: Margin Call Indicator */}
          <div className="bg-[#09090B] p-4 rounded-2xl border border-[#27272A]">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#FB923C]/10 text-[#FB923C] mb-2 uppercase tracking-wide">
              公式 2：追繳觸發邏輯
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              融券保證金成數 = (融券權益 / 股票市值) &le; MMR
            </div>
            <p className="text-xs text-[#A1A1AA] mt-1.5">
              當融券放空的股票大暴漲，導致融券權益成數低於維持比率（{(shortParams.mmr * 100).toFixed(0)}%）時觸發。
            </p>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#18181B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-2 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#A1A1AA]">當前成數:</span>
              <span>(${calculatedShort.equity.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} / ${calculatedShort.itemMarketValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}) =</span>
              <span className={`font-semibold ${(calculatedShort.marginRatio <= shortParams.mmr) ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                {(calculatedShort.marginRatio * 100).toFixed(1)}%
              </span>
              <span className="text-[#A1A1AA]">vs</span>
              <span>維持門檻 {(shortParams.mmr * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Formula 3: Margin Call Target Price */}
          <div className="bg-[#EF4444]/5 p-4 rounded-2xl border border-[#EF4444]/20">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#EF4444]/10 text-[#F87171] mb-2 uppercase tracking-wide flex items-center w-fit gap-1">
              <AlertTriangle className="w-3.5 h-3.5" /> 關鍵追繳價門檻公式
            </span>
            <div className="font-mono text-[#FAFAFA] text-sm py-1 font-semibold">
              臨界股票市值 &ge; 總保證金帳戶餘額 / (1 + MMR)
            </div>
            <div className="font-mono text-[#A1A1AA] text-xs py-0.5 mt-1">
              臨界追繳價 &ge; [ 臨界價值 ] / 股數
            </div>
            {/* Live Calculation */}
            <div className="mt-3 bg-[#09090B] p-3 border border-[#27272A] rounded-xl flex flex-wrap items-center gap-1 text-xs text-[#FAFAFA] font-mono">
              <span className="text-[#EF4444] font-semibold">當前股價觸及臨界點:</span>
              <span className="bg-[#18181B] px-2 py-1 border border-[#27272A] rounded text-[#EF4444] font-bold">
                ${calculatedShort.marginCallPrice.toFixed(2)}
              </span>
              <span className="text-[10px] text-[#A1A1AA] block w-full mt-1.5">
                * 當模擬股價超越此價位時，系統即跳出「融券追繳警告」並作警報提示。
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
