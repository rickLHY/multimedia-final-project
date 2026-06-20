import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Volume2, Home, ExternalLink, Sparkles, Play } from 'lucide-react';
import { soundSynthesizer } from '../utils/audio';

type SlideMedia = 'text' | 'audio' | 'full';

const TEAL = '#0D9488';
const RED = '#DC2626';

// ── Narration scripts ──────────────────────────────────────────────────────────
const NARRATIONS = [
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

// ── Slide visual sub-components ────────────────────────────────────────────────

function TitleVisual() {
  return (
    <div className="flex items-center gap-2 w-full max-w-sm">
      <div className="flex flex-col items-center">
        <div className="w-0 h-0" style={{ borderLeft: '28px solid transparent', borderRight: '28px solid transparent', borderBottom: `48px solid ${TEAL}` }} />
        <div className="w-14 h-20" style={{ backgroundColor: TEAL }} />
      </div>
      <div className="flex-1 h-3 rounded-full" style={{ backgroundColor: '#52525B' }} />
      <div className="flex flex-col items-center">
        <div className="w-14 h-20" style={{ backgroundColor: RED }} />
        <div className="w-0 h-0" style={{ borderLeft: '28px solid transparent', borderRight: '28px solid transparent', borderTop: `48px solid ${RED}` }} />
      </div>
    </div>
  );
}

function BowtieVisual() {
  return (
    <svg viewBox="0 0 360 200" className="w-full max-w-sm">
      <polygon points="175,90 175,110 20,170 20,30" fill={TEAL} opacity="0.85" />
      <polygon points="185,90 185,110 340,30 340,170" fill={RED} opacity="0.85" />
      <rect x="175" y="82" width="10" height="36" fill="#52525B" />
      <text x="80" y="105" fill="white" fontSize="13" textAnchor="middle" fontWeight="600">融資</text>
      <text x="80" y="122" fill="white" fontSize="11" textAnchor="middle">借入資金</text>
      <text x="270" y="105" fill="white" fontSize="13" textAnchor="middle" fontWeight="600">融券</text>
      <text x="270" y="122" fill="white" fontSize="11" textAnchor="middle">借入股票</text>
      <rect x="161" y="82" width="38" height="36" fill="#3F3F46" rx="2" />
      <text x="180" y="98" fill="#A1A1AA" fontSize="9" textAnchor="middle">初始</text>
      <text x="180" y="112" fill="#A1A1AA" fontSize="9" textAnchor="middle">資金</text>
    </svg>
  );
}

function MarginBuyFlow() {
  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-xs">
      {/* Broker top */}
      <circle cx="130" cy="40" r="38" fill={TEAL} />
      <text x="130" y="37" fill="white" fontSize="12" textAnchor="middle" fontWeight="700">券商</text>
      <text x="130" y="52" fill="white" fontSize="10" textAnchor="middle">(Broker)</text>
      {/* Investor bottom-left */}
      <circle cx="40" cy="210" r="38" fill="#27272A" stroke={TEAL} strokeWidth="2" />
      <text x="40" y="207" fill="white" fontSize="11" textAnchor="middle" fontWeight="600">投資人</text>
      <text x="40" y="221" fill="#A1A1AA" fontSize="9" textAnchor="middle">(Investor)</text>
      {/* Market bottom-right */}
      <circle cx="220" cy="210" r="38" fill="#27272A" stroke={TEAL} strokeWidth="2" />
      <text x="220" y="207" fill="white" fontSize="11" textAnchor="middle" fontWeight="600">市場</text>
      <text x="220" y="221" fill="#A1A1AA" fontSize="9" textAnchor="middle">(Market)</text>
      {/* Arrows */}
      <defs>
        <marker id="arrowT" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <polygon points="0 0, 6 3, 0 6" fill={TEAL} />
        </marker>
      </defs>
      {/* Broker → Investor */}
      <line x1="95" y1="68" x2="65" y2="178" stroke={TEAL} strokeWidth="2" markerEnd="url(#arrowT)" />
      {/* Investor → Market */}
      <line x1="78" y1="210" x2="178" y2="210" stroke={TEAL} strokeWidth="2" markerEnd="url(#arrowT)" />
      {/* Market → Broker */}
      <line x1="210" y1="172" x2="155" y2="70" stroke={TEAL} strokeWidth="2" markerEnd="url(#arrowT)" />
      {/* Labels */}
      <text x="60" y="125" fill={TEAL} fontSize="9" textAnchor="middle" transform="rotate(-60,60,125)">借出資金</text>
      <text x="130" y="198" fill={TEAL} fontSize="9" textAnchor="middle">買進股票</text>
      <text x="195" y="125" fill={TEAL} fontSize="9" textAnchor="middle" transform="rotate(55,195,125)">股票抵押</text>
    </svg>
  );
}

function WaterTankVisual({ inverted = false }: { inverted?: boolean }) {
  const waterColor = inverted ? RED : TEAL;
  const dangerLabel = inverted ? '股價上漲，負債膨脹' : '股價下跌，水位蒸發';
  return (
    <svg viewBox="0 0 200 260" className="w-full max-w-[180px]">
      {/* Tank outline */}
      <rect x="30" y="10" width="140" height="220" fill="none" stroke="#3F3F46" strokeWidth="2" rx="4" />
      {/* Water fill */}
      <rect x="31" y="40" width="138" height="120" fill={waterColor} opacity="0.35" />
      {/* Equity level */}
      <rect x="31" y="90" width="138" height="70" fill={waterColor} opacity="0.7" />
      {/* MMR red line */}
      <line x1="20" y1="195" x2="185" y2="195" stroke="#EF4444" strokeWidth="3" />
      {/* Labels */}
      <text x="100" y="130" fill="white" fontSize="11" textAnchor="middle" fontWeight="600">權益數</text>
      <text x="100" y="145" fill="white" fontSize="10" textAnchor="middle">(Equity)</text>
      {inverted && (
        <>
          <text x="100" y="65" fill={waterColor} fontSize="10" textAnchor="middle">IMR (50%)</text>
        </>
      )}
      <text x="192" y="199" fill="#EF4444" fontSize="10" textAnchor="start">MMR</text>
      {/* Evaporation arrows */}
      <text x="100" y="32" fill="#A1A1AA" fontSize="9" textAnchor="middle">{dangerLabel}</text>
      <line x1="80" y1="38" x2="80" y2="48" stroke="#A1A1AA" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="100" y1="38" x2="100" y2="48" stroke="#A1A1AA" strokeWidth="1" strokeDasharray="3,2" />
      <line x1="120" y1="38" x2="120" y2="48" stroke="#A1A1AA" strokeWidth="1" strokeDasharray="3,2" />
    </svg>
  );
}

function LeverageDragChart() {
  const bars = [
    { label: '股價 +30%', ideal: 60, actual: 51, drag: -9, idealColor: '#A1A1AA', actualColor: TEAL },
    { label: '股價 0%', ideal: 0, actual: -9, drag: -9, idealColor: '#A1A1AA', actualColor: RED },
    { label: '股價 -30%', ideal: -60, actual: -69, drag: -9, idealColor: '#A1A1AA', actualColor: RED },
  ];
  const scale = 1.4;
  const zero = 100;
  return (
    <svg viewBox="0 0 300 240" className="w-full max-w-xs">
      {/* Zero line */}
      <line x1="20" y1={zero} x2="290" y2={zero} stroke="#52525B" strokeWidth="1.5" />
      <text x="15" y={zero + 4} fill="#A1A1AA" fontSize="9" textAnchor="end">0%</text>
      {bars.map((bar, i) => {
        const x = 50 + i * 88;
        const idealH = Math.abs(bar.ideal) * scale;
        const actualH = Math.abs(bar.actual) * scale;
        const idealY = bar.ideal >= 0 ? zero - idealH : zero;
        const actualY = bar.actual >= 0 ? zero - actualH : zero;
        return (
          <g key={i}>
            {/* Ideal bar (grey, behind) */}
            <rect x={x} y={idealY} width={28} height={idealH || 2} fill="#52525B" opacity="0.6" rx="2" />
            {/* Actual bar */}
            <rect x={x + 30} y={actualY} width={28} height={actualH || 2} fill={bar.actualColor} opacity="0.9" rx="2" />
            {/* Drag label */}
            {bar.drag !== 0 && (
              <text x={x + 43} y={actualY - 4} fill="#EF4444" fontSize="8" textAnchor="middle">{bar.drag}%</text>
            )}
            {/* Actual value */}
            {bar.actual !== 0 && (
              <text x={x + 44} y={bar.actual > 0 ? actualY - 14 : actualY + actualH + 12} fill={bar.actualColor} fontSize="9" textAnchor="middle" fontWeight="700">{bar.actual}%</text>
            )}
            {/* X label */}
            <text x={x + 43} y={230} fill="#A1A1AA" fontSize="8" textAnchor="middle">{bar.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

function ShortSaleFlow() {
  return (
    <div className="flex items-center gap-2">
      {[
        { label: '投資人', sub: 'Investor', color: RED },
        { label: '券商', sub: 'Broker', color: RED },
        { label: '市場', sub: 'Market', color: '#3F3F46' },
      ].map((node, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center border-2" style={{ backgroundColor: node.color, borderColor: node.color }}>
              <span className="text-white text-xs font-bold">{node.label}</span>
              <span className="text-white/70 text-[9px]">{node.sub}</span>
            </div>
          </div>
          {i < 2 && (
            <div className="flex-1 flex flex-col items-center gap-1">
              {i === 0 && <span className="text-[10px] text-zinc-400 text-center">T=0 建倉</span>}
              {i === 1 && <span className="text-[10px]" style={{ color: RED }}>借出股票</span>}
              <div className="flex items-center gap-1 w-full">
                {i === 0 && <div className="flex-1 text-[9px] text-zinc-500 text-center">賣出換現↙</div>}
                <div className="flex-1 h-[2px]" style={{ backgroundColor: RED }} />
                <div className="w-0 h-0" style={{ borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `7px solid ${RED}` }} />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function DividendCompare() {
  return (
    <div className="grid grid-cols-2 gap-4">
      {[
        {
          title: '做多 (融資)',
          icon: '↑',
          color: TEAL,
          formula: '獲利 = (賣出價 + 股利) − 買入價',
          tag: '+Dividend',
          tagColor: '#22C55E',
          desc: '股利流入，複利再投資，長期收益加乘。',
        },
        {
          title: '做空 (融券)',
          icon: '↓',
          color: RED,
          formula: '獲利 = 放空價 − (買回價 + 股利)',
          tag: '−Dividend',
          tagColor: '#EF4444',
          desc: '除息日須自掏腰包補償出借方，高殖利率標的風險加倍。',
        },
      ].map((item, i) => (
        <div key={i} className="rounded-xl border p-4 flex flex-col gap-2" style={{ borderColor: item.color, backgroundColor: '#18181B' }}>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold" style={{ color: item.color }}>{item.icon}</span>
            <span className="font-bold text-sm text-white">{item.title}</span>
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: `${item.tagColor}20`, color: item.tagColor }}>{item.tag}</span>
          </div>
          <div className="text-[11px] font-mono text-zinc-300 bg-zinc-900 rounded p-2">{item.formula}</div>
          <p className="text-xs text-zinc-400">{item.desc}</p>
        </div>
      ))}
    </div>
  );
}

function ComparisonTable() {
  const rows = [
    { label: '市場方向', buy: '看多 (Bullish)', short: '看空 (Bearish)' },
    { label: '借入資產', buy: '現金 (Cash)', short: '股票 (Shares)' },
    { label: '隱藏成本', buy: '融資利息 (Interest)', short: '股利補償 (Dividend Liability)' },
    { label: '最大風險', buy: '100% 本金虧損', short: '理論上無上限 (Unlimited)' },
  ];
  return (
    <table className="w-full text-sm border-collapse">
      <thead>
        <tr>
          <th className="py-3 px-4 text-left text-zinc-400 font-medium border-b border-zinc-700 w-1/3" />
          <th className="py-3 px-4 text-center font-bold border-b border-zinc-700" style={{ color: TEAL }}>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: TEAL }} />融資 (Long on Margin)</span>
          </th>
          <th className="py-3 px-4 text-center font-bold border-b border-zinc-700" style={{ color: RED }}>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: RED }} />融券 (Short Selling)</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} className={i % 2 === 0 ? 'bg-zinc-900/40' : ''}>
            <td className="py-3 px-4 text-zinc-300 font-semibold border-b border-zinc-800">{row.label}</td>
            <td className="py-3 px-4 text-center text-zinc-200 border-b border-zinc-800" style={{ color: i === 3 ? '#A1A1AA' : undefined }}>{row.buy}</td>
            <td className="py-3 px-4 text-center border-b border-zinc-800 font-bold" style={{ color: i === 3 ? RED : '#A1A1AA' }}>{row.short}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ── Slide content definitions ──────────────────────────────────────────────────

type SlideRenderFn = (withText: boolean) => React.ReactNode;
interface SlideConfig {
  narration: string;
  linkedTrade?: 'margin-buy' | 'short-sale';
  render: SlideRenderFn;
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
      {label}
    </span>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{children}</h2>;
}

function SplitLayout({ left, right }: { left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row gap-8 items-center w-full h-full px-4 sm:px-10 py-6">
      <div className="flex-1 flex flex-col gap-4">{left}</div>
      <div className="flex-1 flex items-center justify-center">{right}</div>
    </div>
  );
}

function BulletList({ items, color = '#A1A1AA' }: { items: React.ReactNode[]; color?: string }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 items-start text-sm text-zinc-300">
          <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items, color = TEAL }: { items: React.ReactNode[]; color?: string }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 items-start text-sm text-zinc-300">
          <span className="w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${color}20`, color }}>
            {i + 1}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function FormulaBox({ title, formula, items, color }: { title: string; formula?: string; items: string[]; color: string }) {
  return (
    <div className="rounded-xl border p-4 flex flex-col gap-2.5" style={{ borderColor: `${color}50`, backgroundColor: '#18181B' }}>
      <h3 className="text-sm font-bold" style={{ color }}>{title}</h3>
      {formula && (
        <div className="text-xs font-mono text-zinc-200 bg-zinc-900 rounded p-2 leading-relaxed">{formula}</div>
      )}
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="text-xs text-zinc-400">{item}</li>
        ))}
      </ul>
    </div>
  );
}

function SimulatorCTA({ tradeMode, mediaMode, color, label }: { tradeMode: string; mediaMode: string; color: string; label: string }) {
  return (
    <Link
      to={`/${tradeMode}/${mediaMode}`}
      className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition-all hover:scale-105 active:scale-95"
      style={{ backgroundColor: `${color}20`, color, border: `2px solid ${color}60` }}
    >
      <ExternalLink className="w-4 h-4" />
      {label}
    </Link>
  );
}

function buildSlides(mediaMode: string): SlideConfig[] {
  return [
    // ── 0: Title ──────────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[0],
      render: (withText) => (
        <div className="flex flex-col items-center justify-center h-full gap-8 px-4 text-center">
          <div className="flex flex-col items-center gap-2">
            <Pill color="#22C55E" label="保證金交易入門" />
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white leading-tight mt-2">
              槓桿的雙向刃
            </h1>
            <h2 className="text-2xl sm:text-3xl font-bold" style={{ color: TEAL }}>融資與融券</h2>
            {withText && (
              <p className="text-zinc-400 text-base mt-2 max-w-md">透視保證金交易的流動性機制與隱藏成本</p>
            )}
          </div>
          <TitleVisual />
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: TEAL }} /><span className="text-zinc-400">融資 — 借錢買股</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-sm" style={{ backgroundColor: RED }} /><span className="text-zinc-400">融券 — 借股賣空</span></div>
          </div>
        </div>
      ),
    },
    // ── 1: 槓桿的本質 ──────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[1],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color={TEAL} label="概念" />
              <SectionTitle>槓桿的本質：市場波動的無差別放大器</SectionTitle>
              {withText && (
                <>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    透過保證金帳戶（Margin Account），投資人能操作超過自身本金的部位。
                    然而，槓桿放大的不僅是潛在報酬，還包含下檔風險與「經常性成本」。
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {[
                      { label: '放大獲利', color: TEAL, desc: '同等本金，放大部位規模' },
                      { label: '放大虧損', color: RED, desc: '逆勢時，損失同步放大' },
                      { label: '增加風險', color: RED, desc: '追繳風險，強制平倉壓力' },
                      { label: '累積成本', color: '#EAB308', desc: '利息、借券費持續侵蝕' },
                    ].map((item, i) => (
                      <div key={i} className="rounded-lg p-3 border" style={{ borderColor: `${item.color}30`, backgroundColor: '#1C1C1F' }}>
                        <div className="text-xs font-bold mb-1" style={{ color: item.color }}>{item.label}</div>
                        <div className="text-xs text-zinc-500">{item.desc}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          }
          right={<BowtieVisual />}
        />
      ),
    },
    // ── 2: 融資買進機制 ────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[2],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color={TEAL} label="融資機制" />
              <SectionTitle>融資買進：借資買股</SectionTitle>
              {withText && (
                <>
                  <NumberedList
                    color={TEAL}
                    items={[
                      <span key="1">準備<strong className="text-white"> 自備款 (Initial Margin)</strong>，向券商借入剩餘資金</span>,
                      <span key="2">在市場上買進標的股票，股票成為保證金帳戶的<strong className="text-white">抵押品</strong></span>,
                      <span key="3">未來賣出還款，賺取差價</span>,
                    ]}
                  />
                  <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-mono text-sm text-zinc-200 space-y-1">
                    <div className="text-zinc-500 text-xs mb-2">核心公式</div>
                    <div><span className="text-white font-bold">權益數 (Equity)</span> = </div>
                    <div className="pl-4 text-zinc-300">總資產市值 (Position Value)</div>
                    <div className="pl-4 text-zinc-400">− 借款本金 (Borrowing)</div>
                  </div>
                </>
              )}
            </>
          }
          right={<MarginBuyFlow />}
        />
      ),
    },
    // ── 3: 保證金水位線 ────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[3],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color="#EF4444" label="風險邊界" />
              <SectionTitle>保證金水位線：風險的邊界</SectionTitle>
              {withText && (
                <>
                  <BulletList
                    color="#EF4444"
                    items={[
                      <span key="1"><strong className="text-white">維持保證金 (MMR)</strong>：帳戶權益數的最低容忍底線，交易所規定最低 <strong className="text-red-400">25%</strong></span>,
                      <span key="2"><strong className="text-white">追繳 (Margin Call)</strong>：跌破 MMR 即觸發，券商要求補繳保證金</span>,
                      <span key="3"><strong className="text-white">強制平倉 (Liquidation)</strong>：未及時補繳，券商強制賣出部位</span>,
                    ]}
                  />
                  <div className="mt-3 rounded-lg bg-red-950/30 border border-red-900/50 p-3 text-xs text-red-300">
                    ⚠️ MMR 是你的最後防線。股價下跌時，保護你的是「距離 MMR 還有多少緩衝」。
                  </div>
                </>
              )}
            </>
          }
          right={<WaterTankVisual />}
        />
      ),
    },
    // ── 4: 隱形殺手：利息 ──────────────────────────────────────────────────────
    {
      narration: NARRATIONS[4],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color="#EAB308" label="隱藏成本" />
              <SectionTitle>隱形殺手：利息對報酬率的侵蝕</SectionTitle>
              {withText && (
                <>
                  <div className="text-xs text-zinc-500 font-mono">設定：本金 $10,000，借款 $10,000（年息 9%），總部位 $20,000</div>
                  <NumberedList
                    color="#EAB308"
                    items={[
                      <span key="1"><strong className="text-white">順風時的阻力</strong>：槓桿紅利被利息摩擦力抵消</span>,
                      <span key="2"><strong className="text-white">平盤時的懲罰</strong>：時間是敵人，持倉即產生絕對虧損</span>,
                      <span key="3"><strong className="text-white">逆風時的重擊</strong>：本金虧損疊加利息，加速崩塌</span>,
                    ]}
                  />
                  <div className="rounded-lg bg-yellow-950/30 border border-yellow-800/40 p-3 text-xs text-yellow-300 mt-2">
                    💡 融資交易是在與「時間」賽跑，利息是恆定的下行引力。
                  </div>
                </>
              )}
            </>
          }
          right={<LeverageDragChart />}
        />
      ),
    },
    // ── 5: 追繳臨界點 (MARGIN_BUY example) ────────────────────────────────────
    {
      narration: NARRATIONS[5],
      linkedTrade: 'margin-buy',
      render: (withText) => (
        <div className="flex flex-col gap-5 w-full px-4 sm:px-10 py-6">
          <div className="flex items-center gap-3">
            <Pill color={TEAL} label="融資範例" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">追繳臨界點：何時會收到 Margin Call？</h2>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-center">
            <span className="text-base text-zinc-400">觸發條件：</span>
            <span className="text-lg font-bold text-white ml-2">Equity / Market Value ≤ MMR</span>
          </div>
          {/* Slider visualization */}
          <div className="relative bg-zinc-800 rounded-full h-4 mx-4 mt-2">
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '28%' }}>
              <div className="w-4 h-4 rounded-sm bg-red-500" />
              {withText && <span className="text-[11px] text-red-400 mt-1 font-bold">追繳點 $58.33</span>}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '55%' }}>
              <div className="w-4 h-4 rounded-sm bg-zinc-500" />
              {withText && <span className="text-[11px] text-zinc-400 mt-1">目前 $60</span>}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '90%' }}>
              <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: TEAL }} />
              {withText && <span className="text-[11px] mt-1 font-bold" style={{ color: TEAL }}>初始 $70</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <FormulaBox
              color={TEAL}
              title="實戰推演 (1000 股)"
              items={[
                '股價 $70：借款 $35,000，權益 $35,000（IMR 50%）',
                '股價降至 $60：權益縮水至 $25,000（保證金率 41.67%）',
              ]}
            />
            <FormulaBox
              color={RED}
              title="追繳價位計算（MMR 40%）"
              formula={`市值 = 借款 / (1 − MMR)\n= $35,000 / (1 − 0.40)\n= $58,333 → 股價 $58.33`}
              items={[]}
            />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <SimulatorCTA tradeMode="margin-buy" mediaMode={mediaMode} color={TEAL} label="在融資模擬器中體驗" />
            {withText && <span className="text-xs text-zinc-500">拖動滑桿，即時看到追繳觸發的那一刻</span>}
          </div>
        </div>
      ),
    },
    // ── 6: 融券放空機制 ────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[6],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color={RED} label="融券機制" />
              <SectionTitle>融券放空：借券賣出</SectionTitle>
              {withText && (
                <>
                  <NumberedList
                    color={RED}
                    items={[
                      <span key="1">預期股價下跌，向券商<strong className="text-white">借入股票</strong>並在市場上賣出</span>,
                      <span key="2">賣出所得現金與自備<strong className="text-white">原始保證金（50%）</strong>共同鎖在帳戶中</span>,
                      <span key="3"><strong className="text-white">回補（Covering）</strong>：未來在市場買回股票還給券商</span>,
                    ]}
                  />
                  <div className="mt-3 rounded-xl border border-zinc-700 bg-zinc-900 p-4 font-mono text-sm text-zinc-200 space-y-1">
                    <div className="text-zinc-500 text-xs mb-2">核心公式</div>
                    <div><span className="text-white font-bold">權益數 (Equity)</span> = </div>
                    <div className="pl-4 text-zinc-300">保證金帳戶總額 (Total Margin Account)</div>
                    <div className="pl-4 text-zinc-400">− 融券市值 (Market Value of Stock Owed)</div>
                  </div>
                </>
              )}
            </>
          }
          right={
            <div className="flex flex-col gap-4 w-full max-w-xs">
              <ShortSaleFlow />
            </div>
          }
        />
      ),
    },
    // ── 7: 倒置的水位線 ────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[7],
      render: (withText) => (
        <SplitLayout
          left={
            <>
              <Pill color={RED} label="無限風險" />
              <SectionTitle>倒置的水位線：無限的潛在虧損</SectionTitle>
              {withText && (
                <>
                  <p className="text-zinc-400 text-sm leading-relaxed">
                    邏輯反轉：在融券中，投資人欠的是「股票」而非固定金額的現金。
                    隨著股價上漲，買回股票的成本（Liabilities）不斷膨脹，持續侵蝕帳戶權益。
                  </p>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div className="rounded-lg p-3 border border-teal-900/40 bg-zinc-900">
                      <div className="text-xs text-zinc-500 mb-1">融資最大虧損</div>
                      <div className="text-lg font-bold" style={{ color: TEAL }}>100%</div>
                      <div className="text-xs text-zinc-500">股價最低跌至 $0</div>
                    </div>
                    <div className="rounded-lg p-3 border border-red-900/40 bg-zinc-900">
                      <div className="text-xs text-zinc-500 mb-1">融券最大虧損</div>
                      <div className="text-lg font-bold" style={{ color: RED }}>∞</div>
                      <div className="text-xs text-zinc-500">股價上漲沒有上限</div>
                    </div>
                  </div>
                </>
              )}
            </>
          }
          right={<WaterTankVisual inverted />}
        />
      ),
    },
    // ── 8: 股利的影響 ──────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[8],
      render: (withText) => (
        <div className="flex flex-col gap-5 w-full px-4 sm:px-10 py-6">
          <div>
            <Pill color="#EAB308" label="隱藏成本" />
            <SectionTitle>股利的影響</SectionTitle>
          </div>
          {withText && (
            <p className="text-zinc-400 text-sm">股利對長期投資者是重要回報，但對融券者卻是看不見的帳單。</p>
          )}
          <DividendCompare />
          {withText && (
            <div className="rounded-lg bg-yellow-950/30 border border-yellow-800/40 p-3 text-xs text-yellow-300">
              💡 洞察：放空高殖利率股票，將面臨沉重的股利償還負擔。放空前務必確認股利政策。
            </div>
          )}
        </div>
      ),
    },
    // ── 9: 放空的紅線 (SHORT_SALE example) ────────────────────────────────────
    {
      narration: NARRATIONS[9],
      linkedTrade: 'short-sale',
      render: (withText) => (
        <div className="flex flex-col gap-5 w-full px-4 sm:px-10 py-6">
          <div className="flex items-center gap-3">
            <Pill color={RED} label="融券範例" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">放空的紅線：融券追繳價位</h2>
          </div>
          <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 px-6 py-3 text-center">
            <span className="text-base text-zinc-400">觸發條件：</span>
            <span className="text-lg font-bold text-white ml-2">Equity / Stock Owed ≤ MMR</span>
          </div>
          {/* Slider visualization */}
          <div className="relative bg-zinc-800 rounded-full h-4 mx-4 mt-2">
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '5%' }}>
              <div className="w-4 h-4 rounded-sm bg-zinc-500" />
              {withText && <span className="text-[11px] text-zinc-400 mt-1">放空 $60</span>}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '42%' }}>
              <div className="w-4 h-4 rounded-sm bg-zinc-500" />
              {withText && <span className="text-[11px] text-zinc-400 mt-1">目前 $65</span>}
            </div>
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{ left: '72%' }}>
              <div className="w-4 h-4 rounded-sm bg-red-500" />
              {withText && <span className="text-[11px] text-red-400 mt-1 font-bold">追繳點 $69.23</span>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <FormulaBox
              color={RED}
              title="實戰推演 (100 股)"
              items={[
                '股價 $60：賣出所得 $6,000 + 保證金 $3,000 = 總額 $9,000',
                '股價漲至 $80：負債膨脹為 $8,000，權益僅剩 $1,000',
              ]}
            />
            <FormulaBox
              color="#EAB308"
              title="追繳價位計算（MMR 30%）"
              formula={`市值 = 帳戶總額 / (1 + MMR)\n= $9,000 / (1 + 0.30)\n= $6,923 → 股價 $69.23`}
              items={[]}
            />
          </div>
          <div className="flex items-center gap-3 mt-1">
            <SimulatorCTA tradeMode="short-sale" mediaMode={mediaMode} color={RED} label="在融券模擬器中體驗" />
            {withText && <span className="text-xs text-zinc-500">拖動滑桿，即時看到追繳觸發的那一刻</span>}
          </div>
        </div>
      ),
    },
    // ── 10: 終極對照 ───────────────────────────────────────────────────────────
    {
      narration: NARRATIONS[10],
      render: (withText) => (
        <div className="flex flex-col gap-5 w-full px-4 sm:px-10 py-6">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">槓桿雙刃的終極對照</h2>
            {withText && <p className="text-zinc-500 text-sm mt-1">融資 vs 融券：相同的工具，截然不同的風險結構</p>}
          </div>
          <ComparisonTable />
          {withText && (
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Link to={`/margin-buy/${mediaMode}`} className="flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-all hover:scale-105 active:scale-95 border-2" style={{ borderColor: `${TEAL}60`, backgroundColor: `${TEAL}15`, color: TEAL }}>
                <ExternalLink className="w-4 h-4" />融資模擬器
              </Link>
              <Link to={`/short-sale/${mediaMode}`} className="flex items-center justify-center gap-2 rounded-xl py-3 font-bold text-sm transition-all hover:scale-105 active:scale-95 border-2" style={{ borderColor: `${RED}60`, backgroundColor: `${RED}15`, color: RED }}>
                <ExternalLink className="w-4 h-4" />融券模擬器
              </Link>
            </div>
          )}
        </div>
      ),
    },
  ];
}

// ── Main SlidesPage ────────────────────────────────────────────────────────────

const VALID_MODES = new Set(['text', 'audio', 'full']);

export default function SlidesPage() {
  const { mediaMode = 'full' } = useParams<{ mediaMode: string }>();
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);

  if (!VALID_MODES.has(mediaMode)) return <Navigate to="/slides/full" replace />;

  const mode = mediaMode as SlideMedia;
  const withText  = mode === 'text'  || mode === 'full';
  const withAudio = mode === 'audio' || mode === 'full';

  const slides = buildSlides(mediaMode);
  const total = slides.length;

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= total) return;
    setDirection(idx > current ? 1 : -1);
    setCurrent(idx);
  }, [current, total]);

  const prev = () => goTo(current - 1);
  const next = () => goTo(current + 1);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
      if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [current]);

  // Audio narration on slide change
  useEffect(() => {
    if (!withAudio) return;
    soundSynthesizer.playNarration(slides[current].narration);
    return () => soundSynthesizer.stopNarration();
  }, [current, withAudio]);

  const modeLabel = mode === 'text' ? '圖＋文' : mode === 'audio' ? '圖＋音' : '圖音文';
  const modeColor = mode === 'text' ? '#A1A1AA' : mode === 'audio' ? '#EAB308' : '#22C55E';
  const backUrl   = mode === 'text' ? '/margin-buy/text' : mode === 'audio' ? '/margin-buy/audio' : '/margin-buy/full';

  const variants = {
    enter:  (d: number) => ({ x: d > 0 ? '60%' : '-60%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (d: number) => ({ x: d > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#09090B] text-white select-none">
      {/* Header */}
      <header className="shrink-0 bg-[#18181B] border-b border-[#27272A] h-12 flex items-center px-4 gap-3">
        <Link to={backUrl} className="flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors text-sm">
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">回到模擬器</span>
        </Link>
        <div className="w-px h-5 bg-zinc-700 mx-1" />
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#22C55E' }} />
          <span className="text-sm font-bold text-zinc-200">槓桿雙向刃</span>
        </div>
        <div className="flex-1" />
        {/* Mode switcher */}
        <div className="flex gap-1">
          {(['text', 'audio', 'full'] as SlideMedia[]).map((m) => (
            <Link
              key={m}
              to={`/slides/${m}`}
              onClick={() => setCurrent(0)}
              className="px-2 py-0.5 rounded text-xs font-bold transition-colors"
              style={mode === m ? { backgroundColor: `${modeColor}20`, color: modeColor } : { color: '#71717A' }}
            >
              {m === 'text' ? '圖文' : m === 'audio' ? '音頻' : '完整'}
            </Link>
          ))}
        </div>
        <div className="ml-2 px-2 py-0.5 rounded text-xs font-mono border" style={{ color: modeColor, borderColor: `${modeColor}40` }}>
          {modeLabel}
        </div>
        {mode === 'text' && (
          <button
            onClick={() => soundSynthesizer.playNarration(slides[current].narration)}
            className="ml-1 p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
            title="播放本頁旁白"
          >
            <Volume2 className="w-4 h-4" />
          </button>
        )}
      </header>

      {/* Progress bar */}
      <div className="shrink-0 h-1 bg-zinc-800">
        <motion.div
          className="h-full"
          style={{ backgroundColor: modeColor }}
          animate={{ width: `${((current + 1) / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Slide area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={current}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="absolute inset-0 flex items-center justify-center overflow-y-auto"
          >
            <div className="w-full max-w-5xl min-h-full flex items-center justify-center">
              {slides[current].render(withText)}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Side nav arrows */}
        <button
          onClick={prev}
          disabled={current === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          disabled={current === total - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center text-zinc-300 hover:text-white hover:bg-zinc-700 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Footer navigation */}
      <footer className="shrink-0 bg-[#18181B] border-t border-[#27272A] h-12 flex items-center justify-center gap-4 px-4">
        <button onClick={prev} disabled={current === 0} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <ChevronLeft className="w-4 h-4" /> 上一頁
        </button>

        {/* Dot indicators */}
        <div className="flex gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width:  i === current ? 20 : 6,
                height: 6,
                backgroundColor: i === current ? modeColor : '#3F3F46',
              }}
            />
          ))}
        </div>

        <button onClick={next} disabled={current === total - 1} className="flex items-center gap-1 text-sm text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          下一頁 <ChevronRight className="w-4 h-4" />
        </button>

        <div className="absolute right-4 text-xs text-zinc-600 font-mono">
          {current + 1} / {total}
        </div>
      </footer>
    </div>
  );
}
