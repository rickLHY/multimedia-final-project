/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SimulatorMode = 'MARGIN_BUY' | 'SHORT_SALE';

export type MultimediaMode = 'TEXT_CHART' | 'CHART_AUDIO' | 'TEXT_CHART_AUDIO';

export interface MarginBuyParams {
  symbol: string;
  shares: number;
  initialPrice: number;
  imr: number;           // Initial Margin Requirement (e.g. 0.50)
  mmr: number;           // Maintenance Margin Requirement (e.g. 0.40)
  extraCash: number;
  simulatedPrice: number;
  annualRate: number;    // 融資年利率 (e.g. 0.065 = 6.5%)
  daysHeld: number;      // 持有天數
  dividendPerShare: number; // 每股現金股利
}

export interface ShortSaleParams {
  symbol: string;
  shares: number;
  initialPrice: number;
  imr: number;
  mmr: number;
  simulatedPrice: number;
  annualBorrowRate: number; // 借券年費率 (e.g. 0.03 = 3%)
  daysShorted: number;      // 放空持有天數
  dividendPerShare: number; // 每股股利（需補償出借方）
}

export interface CalculatedBuyState {
  itemMarketValue: number;
  loanAmount: number;
  equity: number;
  marginRatio: number;
  marginCallPrice: number;
  isMarginCall: boolean;
  accruedInterest: number;  // 累計利息費用
  dividendIncome: number;   // 股利收入
}

export interface CalculatedShortState {
  itemMarketValue: number;
  totalMarginBalance: number;
  equity: number;
  marginRatio: number;
  marginCallPrice: number;
  isMarginCall: boolean;
  borrowingFee: number;  // 累計借券費用
  dividendOwed: number;  // 需補償出借方股利
}
