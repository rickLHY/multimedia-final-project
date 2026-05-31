import React, { useRef, useState, useEffect } from 'react';
import { SimulatorMode } from '../types';
import { Info } from 'lucide-react';

interface InteractiveChartProps {
  mode: SimulatorMode;
  initialPrice: number;
  simulatedPrice: number;
  marginCallPrice: number;
  isMarginCall: boolean;
}

export default function InteractiveChart({
  mode,
  initialPrice,
  simulatedPrice,
  marginCallPrice,
  isMarginCall,
}: InteractiveChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 500, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({
          width: Math.max(width, 280),
          height: Math.max(height - 60, 120),
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  const isBuy = mode === 'MARGIN_BUY';

  // Define scale parameters
  const minPrice = initialPrice * 0.2;
  const maxPrice = initialPrice * 2.0;

  // Convert stock price to X coordinate
  const getX = (price: number) => {
    const ratio = (price - minPrice) / (maxPrice - minPrice);
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const padding = 40;
    return padding + clampedRatio * (dimensions.width - padding * 2);
  };

  const currentX = getX(simulatedPrice);
  const targetX = getX(marginCallPrice);
  const initialX = getX(initialPrice);

  const paddingY = 30;
  const chartHeight = dimensions.height;
  const timelineY = chartHeight - 70;

  const ticks = [
    minPrice,
    initialPrice * 0.5,
    initialPrice,
    initialPrice * 1.5,
    maxPrice,
  ].filter((p) => p >= minPrice && p <= maxPrice);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full rounded-2xl border p-4 transition-all duration-300 bg-[#18181B] ${
        isMarginCall
          ? 'border-red-600/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
          : 'border-[#27272A]'
      }`}
    >
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${isMarginCall ? 'bg-red-500' : 'bg-[#22C55E]'}`} />
          <h4 className="font-semibold text-[#FAFAFA] text-sm">股價動態模擬 Chart</h4>
        </div>
        <div className="flex gap-4 text-xs font-mono">
          <span className="flex items-center gap-1 text-[#A1A1AA]">
            初始價: <strong className="text-[#FAFAFA]">${initialPrice.toFixed(1)}</strong>
          </span>
          <span className="flex items-center gap-1 text-indigo-400">
            當前模擬: <strong className="font-bold text-[#FAFAFA]">${simulatedPrice.toFixed(1)}</strong>
          </span>
        </div>
      </div>

      <svg width={dimensions.width} height={dimensions.height} className="overflow-visible">
        <defs>
          {/* Gradient for safe vs danger overlay */}
          <linearGradient id="safeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#22C55E" stopOpacity="0.01" />
          </linearGradient>
          <linearGradient id="dangerGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0.02" />
          </linearGradient>
          <radialGradient id="glowPulse" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={isMarginCall ? '#EF4444' : '#6366F1'} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isMarginCall ? '#EF4444' : '#6366F1'} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Draw Zones */}
        {isBuy ? (
          <>
            {/* Buying Margin Call: Warning zone is LEFT (below threshold), Safe zone is RIGHT */}
            <rect
              x={40}
              y={paddingY}
              width={Math.max(0, targetX - 40)}
              height={timelineY - paddingY}
              fill="url(#dangerGradient)"
              rx={12}
            />
            <rect
              x={targetX}
              y={paddingY}
              width={Math.max(0, dimensions.width - 40 - targetX)}
              height={timelineY - paddingY}
              fill="url(#safeGradient)"
              rx={12}
            />
          </>
        ) : (
          <>
            {/* Short Margin Call: Safe zone is LEFT (below threshold), Warning zone is RIGHT (above threshold) */}
            <rect
              x={40}
              y={paddingY}
              width={Math.max(0, targetX - 40)}
              height={timelineY - paddingY}
              fill="url(#safeGradient)"
              rx={12}
            />
            <rect
              x={targetX}
              y={paddingY}
              width={Math.max(0, dimensions.width - 40 - targetX)}
              height={timelineY - paddingY}
              fill="url(#dangerGradient)"
              rx={12}
            />
          </>
        )}

        {/* 2. Grid lines */}
        <line
          x1={40}
          y1={timelineY}
          x2={dimensions.width - 40}
          y2={timelineY}
          stroke="#27272A"
          strokeWidth="2"
        />

        {/* 3. Initial Price Line marker */}
        <line
          x1={initialX}
          y1={paddingY}
          x2={initialX}
          y2={timelineY}
          stroke="#A1A1AA"
          strokeWidth="1.5"
          strokeDasharray="3 3"
          opacity="0.6"
        />
        <text
          x={initialX + 5}
          y={paddingY + 15}
          fill="#FAFAFA"
          fontSize="10"
          fontWeight="semibold"
          className="font-sans"
        >
          原交易價 (${initialPrice.toFixed(0)})
        </text>

        {/* 4. Margin Call Limit line */}
        <line
          x1={targetX}
          y1={paddingY - 5}
          x2={targetX}
          y2={timelineY + 10}
          stroke="#EF4444"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        <text
          x={targetX - 5}
          y={paddingY + 35}
          fill="#F87171"
          fontSize="10"
          fontWeight="bold"
          textAnchor="end"
          className="font-sans"
        >
          {isBuy ? '融資追繳價 ➔' : '融券追繳價 ➔'}
        </text>
        <text
          x={targetX + 6}
          y={paddingY + 35}
          fill="#F87171"
          fontSize="10"
          fontWeight="bold"
          textAnchor="start"
          className="font-mono bg-[#18181B]"
        >
          ${marginCallPrice.toFixed(1)}
        </text>

        {/* 5. Ticks on X-axis */}
        {ticks.map((t, idx) => {
          const x = getX(t);
          return (
            <g key={idx}>
              <line x1={x} y1={timelineY} x2={x} y2={timelineY + 6} stroke="#27272A" />
              <text
                x={x}
                y={timelineY + 22}
                fill="#A1A1AA"
                fontSize="10"
                fontFamily="monospace"
                textAnchor="middle"
              >
                ${t.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* 6. Zone text indications inside the boxes */}
        {isBuy ? (
          <>
            <text x={(targetX + 40) / 2} y={timelineY - 20} fill="#EF4444" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.8">
              融資追繳區 (Danger)
            </text>
            <text x={(targetX + dimensions.width - 40) / 2} y={timelineY - 20} fill="#22C55E" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.8">
              安全合規區 (Safe)
            </text>
          </>
        ) : (
          <>
            <text x={(targetX + 40) / 2} y={timelineY - 20} fill="#22C55E" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.8">
              安全合規區 (Safe)
            </text>
            <text x={(targetX + dimensions.width - 40) / 2} y={timelineY - 20} fill="#EF4444" fontSize="11" fontWeight="bold" textAnchor="middle" opacity="0.8">
              融券追繳區 (Danger)
            </text>
          </>
        )}

        {/* 7. Current Interactive Stock Price Dot */}
        <g>
          <circle
            cx={currentX}
            cy={timelineY}
            r={24}
            fill="url(#glowPulse)"
          />
          <circle
            cx={currentX}
            cy={timelineY}
            r={8}
            fill={isMarginCall ? '#EF4444' : '#6366F1'}
            stroke="#FAFAFA"
            strokeWidth="2"
            className="transition-all duration-300"
          />
          <g transform={`translate(${currentX}, ${timelineY - 28})`}>
            <rect
              x="-35"
              y="-18"
              width="70"
              height="20"
              rx="6"
              fill={isMarginCall ? '#EF4444' : '#27272A'}
              stroke={isMarginCall ? 'none' : '#52525B'}
              strokeWidth="1"
            />
            <text
              x="0"
              y="-4"
              fill="#FAFAFA"
              fontSize="10"
              fontWeight="bold"
              fontFamily="monospace"
              textAnchor="middle"
            >
              ${simulatedPrice.toFixed(2)}
            </text>
            <polygon
              points="-4,2 4,2 0,6"
              fill={isMarginCall ? '#EF4444' : '#27272A'}
              transform="translate(0,-4)"
            />
          </g>
        </g>
      </svg>

      <div className="mt-2 text-xs text-slate-400 flex flex-col md:flex-row gap-2 items-start md:items-center justify-between">
        <span className="flex items-center gap-1.5 leading-none">
          <span>💡 依 X 軸拖動上方大滑桿變動股價，檢視當前的水位變化。</span>
        </span>
        <span className={`font-semibold  block ${isMarginCall ? 'text-red-400' : 'text-[#22C55E]'}`}>
          {isMarginCall ? '🚨 水位已跌破門檻，立刻增補保證金！' : '✅ 信用保證金充足，帳戶安全健全。'}
        </span>
      </div>
    </div>
  );
}
