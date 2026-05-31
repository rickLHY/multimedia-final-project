/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import SimulatorPage from './pages/SimulatorPage';
import { SimulatorMode, MultimediaMode } from './types';

function PageShell() {
  const { tradeMode, mediaMode } = useParams<{ tradeMode: string; mediaMode: string }>();

  const mode: SimulatorMode = tradeMode === 'short-sale' ? 'SHORT_SALE' : 'MARGIN_BUY';
  const multimedia: MultimediaMode =
    mediaMode === 'text'  ? 'TEXT_CHART' :
    mediaMode === 'audio' ? 'CHART_AUDIO' :
    'TEXT_CHART_AUDIO';

  const title      = mode === 'MARGIN_BUY' ? '融資模擬器' : '融券模擬器';
  const mediaLabel = multimedia === 'TEXT_CHART' ? '圖＋文' : multimedia === 'CHART_AUDIO' ? '圖＋音' : '圖音文';

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#09090B] text-[#FAFAFA] antialiased">
      <header className="shrink-0 bg-[#18181B] border-b border-[#27272A] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22C55E] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#22C55E]" />
              </span>
              <div className="w-8 h-8 rounded-xl bg-linear-to-br from-[#18181B] to-[#27272A] border border-[#27272A] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
              </div>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight text-[#FAFAFA]">{title}</h1>
              <p className="text-[10px] text-[#A1A1AA] font-mono uppercase tracking-wider">Margin Call Simulator</p>
            </div>
          </div>

          {/* Read-only mode indicators — switch via URL only */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">
              {mode === 'MARGIN_BUY' ? '融資購買' : '融券賣出'}
            </span>
            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-[#09090B] text-[#A1A1AA] border border-[#27272A]">
              {mediaLabel}
            </span>
          </div>
        </div>
      </header>

      <SimulatorPage mode={mode} multimediaMode={multimedia} />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/margin-buy/full" replace />} />
      <Route path="/:tradeMode/:mediaMode" element={<PageShell />} />
      <Route path="/:tradeMode" element={<Navigate to="full" replace />} />
    </Routes>
  );
}
