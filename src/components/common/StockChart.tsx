import React, { useState, useRef, useMemo } from 'react';
import { ChartPoint, TimeRange, Position } from '../../types/market';
import { formatCurrency, formatPercent } from '../../services/marketApi';

interface StockChartProps {
  data: ChartPoint[];
  timeRange: TimeRange;
  onTimeRangeChange?: (range: TimeRange) => void;
  isPositive?: boolean;
  basePrice?: number;
  height?: number;
  showTimeSelector?: boolean;
  positions?: Position[];
}

export const StockChart: React.FC<StockChartProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  isPositive = true,
  basePrice,
  height = 230,
  showTimeSelector = true,
  positions = [],
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const points = data && data.length > 0 ? data : [];

  // Determine min and max for scaling
  const { minPrice, maxPrice, priceRange, isTrendUp } = useMemo(() => {
    if (points.length === 0) return { minPrice: 0, maxPrice: 100, priceRange: 100, isTrendUp: true };
    const prices = points.map((p) => p.price);
    
    // Include entry prices with mild margin so guidelines are always visible
    positions.forEach((pos) => {
      if (pos.entryPrice) prices.push(pos.entryPrice);
    });

    const rawMin = Math.min(...prices);
    const rawMax = Math.max(...prices);
    const padding = (rawMax - rawMin) * 0.05 || 1;
    const min = rawMin - padding;
    const max = rawMax + padding;
    const range = max - min === 0 ? 1 : max - min;
    const firstPrice = points[0].price;
    const lastPrice = points[points.length - 1].price;
    const up = lastPrice >= firstPrice;
    return { minPrice: min, maxPrice: max, priceRange: range, isTrendUp: up };
  }, [points, positions]);

  // SVG coordinate dimensions
  const svgWidth = 600;
  const svgHeight = height;
  const paddingY = 20;
  const paddingX = 10;
  const usableHeight = svgHeight - paddingY * 2;
  const usableWidth = svgWidth - paddingX * 2;

  // Active point when scrubbing
  const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : (points.length > 0 ? points[points.length - 1] : null);
  const startPrice = points.length > 0 ? points[0].price : 0;
  const activeDelta = activePoint ? activePoint.price - startPrice : 0;
  const activeDeltaPercent = startPrice > 0 && activePoint ? (activeDelta / startPrice) * 100 : 0;
  const activeIsUp = activeDelta >= 0;

  // Check if scrubbing near a position entry
  const scrubbedPosition = useMemo(() => {
    if (!activePoint || positions.length === 0) return null;
    return positions.find((pos) => Math.abs(pos.openedAt - activePoint.timestamp) <= 3600000);
  }, [activePoint, positions]);

  // Generate SVG path coordinates
  const svgCoordinates = useMemo(() => {
    if (points.length === 0) return [];
    return points.map((p, i) => {
      const x = paddingX + (i / (points.length - 1 || 1)) * usableWidth;
      const normalizedY = (p.price - minPrice) / priceRange;
      const y = svgHeight - paddingY - normalizedY * usableHeight;
      return { x, y, point: p, index: i };
    });
  }, [points, minPrice, priceRange, svgHeight, usableHeight, usableWidth]);

  // Map Position Entry Guidelines
  const entryGuidelines = useMemo(() => {
    if (points.length === 0 || positions.length === 0) return [];

    return positions.map((pos) => {
      const normalizedY = Math.max(0, Math.min(1, (pos.entryPrice - minPrice) / priceRange));
      const y = svgHeight - paddingY - normalizedY * usableHeight;
      const isLong = pos.type === 'LONG';
      const color = isLong ? '#34C759' : '#FF9500';
      const isProfitable = isLong
        ? (activePoint ? activePoint.price >= pos.entryPrice : true)
        : (activePoint ? activePoint.price <= pos.entryPrice : true);

      return {
        pos,
        y,
        isLong,
        color,
        isProfitable,
      };
    });
  }, [points, positions, minPrice, priceRange, svgHeight, usableHeight, usableWidth, activePoint]);

  // Construct authentic financial SVG path
  const { linePath, areaPath } = useMemo(() => {
    if (svgCoordinates.length === 0) return { linePath: '', areaPath: '' };
    if (svgCoordinates.length === 1) {
      const p = svgCoordinates[0];
      return { linePath: `M ${p.x} ${p.y}`, areaPath: '' };
    }

    const d = `M ` + svgCoordinates.map((c) => `${c.x.toFixed(2)} ${c.y.toFixed(2)}`).join(' L ');
    const lastCoord = svgCoordinates[svgCoordinates.length - 1];
    const firstCoord = svgCoordinates[0];
    const area = `${d} L ${lastCoord.x.toFixed(2)} ${svgHeight} L ${firstCoord.x.toFixed(2)} ${svgHeight} Z`;

    return { linePath: d, areaPath: area };
  }, [svgCoordinates, svgHeight]);

  // Touch / Mouse event handlers for scrubbing
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const touchX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, touchX / rect.width));
    const targetIdx = Math.round(ratio * (points.length - 1));
    setHoverIndex(targetIdx);
  };

  const handlePointerLeave = () => {
    setHoverIndex(null);
  };

  const trendColor = isTrendUp ? '#34C759' : '#FF3B30';
  const trendGradientId = `grad_${isTrendUp ? 'green' : 'red'}`;

  const timeRanges: TimeRange[] = ['1H', '1D', '1W', '1M', '1Y', '5Y', 'ALL'];

  return (
    <div className="w-full flex flex-col select-none">
      {/* Dynamic Price Display Header during scrub */}
      <div className="flex items-baseline justify-between mb-2 px-1">
        <div>
          <div className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
            {activePoint ? formatCurrency(activePoint.price) : '$0.00'}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs font-semibold">
            <span className={activeIsUp ? 'text-ios-green' : 'text-ios-red'}>
              {activeIsUp ? '+' : ''}{formatCurrency(activeDelta)} ({formatPercent(activeDeltaPercent)})
            </span>
            <span className="text-zinc-400 font-normal">
              {hoverIndex !== null ? activePoint?.dateStr : `en ${timeRange}`}
            </span>
            {scrubbedPosition && (
              <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-white font-mono text-[10px] border border-white/10">
                Tu Entrada: {scrubbedPosition.type === 'LONG' ? 'Largo' : 'Corto'} @ {formatCurrency(scrubbedPosition.entryPrice)}
              </span>
            )}
          </div>
        </div>

        {/* High / Low markers */}
        <div className="text-right text-[11px] text-zinc-400 hidden sm:block">
          <div>Máx: <span className="font-mono text-zinc-600 dark:text-zinc-300">{formatCurrency(maxPrice)}</span></div>
          <div>Mín: <span className="font-mono text-zinc-600 dark:text-zinc-300">{formatCurrency(minPrice)}</span></div>
        </div>
      </div>

      {/* SVG Canvas Area with Touch Handling */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerMove}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerLeave}
        onPointerCancel={handlePointerLeave}
        onPointerLeave={handlePointerLeave}
        className="relative w-full overflow-hidden cursor-crosshair touch-none select-none py-1"
        style={{ height: `${height}px` }}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id={trendGradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={trendColor} stopOpacity="0.28" />
              <stop offset="60%" stopColor={trendColor} stopOpacity="0.08" />
              <stop offset="100%" stopColor={trendColor} stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill={`url(#${trendGradientId})`}
              className="transition-all duration-300"
            />
          )}

          {/* Line Stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={trendColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-150"
            />
          )}

          {/* Clean Horizontal Entry Level Guidelines */}
          {entryGuidelines.map((guide) => (
            <g key={guide.pos.id}>
              {/* Thin Dashed Guideline */}
              <line
                x1={paddingX}
                y1={guide.y}
                x2={svgWidth - paddingX}
                y2={guide.y}
                stroke={guide.color}
                strokeWidth="1.2"
                strokeDasharray="3 3"
                strokeOpacity="0.65"
              />
            </g>
          ))}

          {/* Scrubber Vertical Line & Cursor */}
          {hoverIndex !== null && svgCoordinates[hoverIndex] && (
            <g>
              <line
                x1={svgCoordinates[hoverIndex].x}
                y1={0}
                x2={svgCoordinates[hoverIndex].x}
                y2={svgHeight}
                stroke="currentColor"
                strokeWidth="1.2"
                strokeDasharray="4 4"
                className="text-zinc-400/80 dark:text-zinc-500/80"
              />
            </g>
          )}
        </svg>

        {/* HTML Overlays for crisp badges without SVG aspect-ratio distortion */}
        {entryGuidelines.map((guide) => {
          const topPercent = (guide.y / svgHeight) * 100;
          return (
            <div
              key={guide.pos.id}
              className="absolute right-2 pointer-events-none -translate-y-1/2 flex items-center gap-1"
              style={{ top: `${topPercent}%` }}
            >
              <div
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold font-mono text-white shadow-sm flex items-center gap-1 ${
                  guide.isLong ? 'bg-ios-green' : 'bg-ios-orange'
                }`}
              >
                <span>{guide.isLong ? '▲ LARGO' : '▼ CORTO'}</span>
                <span>{formatCurrency(guide.pos.entryPrice)}</span>
              </div>
            </div>
          );
        })}

        {/* Scrubber Cursor Point */}
        {hoverIndex !== null && svgCoordinates[hoverIndex] && (
          <div
            className="absolute w-3.5 h-3.5 rounded-full border-2 border-white pointer-events-none shadow-md -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(svgCoordinates[hoverIndex].x / svgWidth) * 100}%`,
              top: `${(svgCoordinates[hoverIndex].y / svgHeight) * 100}%`,
              backgroundColor: trendColor,
            }}
          />
        )}
      </div>

      {/* iOS Timeframe Segmented Switcher */}
      {showTimeSelector && onTimeRangeChange && (
        <div className="mt-3 grid grid-cols-7 gap-1 bg-zinc-100 dark:bg-zinc-900/90 p-1 rounded-xl border border-black/5 dark:border-white/5">
          {timeRanges.map((range) => {
            const isSelected = range === timeRange;
            return (
              <button
                key={range}
                type="button"
                onClick={() => onTimeRangeChange(range)}
                className={`py-1.5 text-xs font-semibold rounded-lg transition-all ios-active ${
                  isSelected
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-black/5 dark:border-white/5'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                {range}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
