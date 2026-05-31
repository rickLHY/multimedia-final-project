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
  imr: number; // Initial Margin Requirement (e.g. 0.50)
  mmr: number; // Maintenance Margin Requirement (e.g. 0.40)
  extraCash: number; // 額外現金
  simulatedPrice: number;
}

export interface ShortSaleParams {
  symbol: string;
  shares: number;
  initialPrice: number;
  imr: number; // Initial Margin Requirement (e.g. 0.50)
  mmr: number; // Maintenance Margin Requirement (e.g. 0.40)
  simulatedPrice: number;
}

export interface CalculatedBuyState {
  itemMarketValue: number; // 當前股票總市值
  loanAmount: number; // 借款金額
  equity: number; // 帳戶權益
  marginRatio: number; // 當前保證金成數 (帳戶權益 / 股票市值)
  marginCallPrice: number; // 觸發追繳的股價門檻
  isMarginCall: boolean; // 是否觸發追繳
}

export interface CalculatedShortState {
  itemMarketValue: number; // 當前買回股票市值
  totalMarginBalance: number; // 總保證金帳戶餘額
  equity: number; // 融券權益
  marginRatio: number; // 當前保證金成數 (融券權益 / 股票市值)
  marginCallPrice: number; // 觸發追繳的股價門檻
  isMarginCall: boolean; // 是否觸發追繳
}
