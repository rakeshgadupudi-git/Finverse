'use client';
import { memo, useState, useEffect } from 'react';
import { T } from '@/lib/tokens';
import { fmt } from '@/lib/utils';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap, ScatterChart, Scatter, ZAxis, Cell,
  ComposedChart, Line } from
'recharts';


// ═══════════════════════════════════════════
// GROWTH CHART — Recharts AreaChart with benchmark
// ═══════════════════════════════════════════






const GrowthTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const portfolio = payload.find((p) => p.dataKey === 'portfolio');
  const benchmark = payload.find((p) => p.dataKey === 'benchmark');
  const diff = portfolio && benchmark ? portfolio.value - benchmark.value : 0;
  const diffPct = benchmark?.value ? (diff / benchmark.value * 100).toFixed(1) : '0';

  return (
    <div style={{
      background: 'rgba(8,11,18,0.95)', border: `1px solid ${T.border.medium}`,
      borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)'
    }}>
            <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 6, fontWeight: 600 }}>{label}</div>
            {portfolio &&
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent.teal }} />
                    <span style={{ fontSize: 11, color: T.text.secondary }}>Portfolio</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 700, color: T.accent.teal, marginLeft: 'auto' }}>
                        {fmt(portfolio.value, 'INR')}
                    </span>
                </div>
      }
            {benchmark &&
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent.gold }} />
                    <span style={{ fontSize: 11, color: T.text.secondary }}>Nifty 50</span>
                    <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: T.accent.gold, marginLeft: 'auto' }}>
                        {fmt(benchmark.value, 'INR')}
                    </span>
                </div>
      }
            {diff !== 0 &&
      <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${T.border.subtle}`, fontSize: 10 }}>
                    <span style={{ color: diff > 0 ? T.accent.teal : T.accent.danger, fontWeight: 700 }}>
                        {diff > 0 ? '▲' : '▼'} {diff > 0 ? '+' : ''}{diffPct}% vs benchmark
                    </span>
                </div>
      }
        </div>);

};

export const GrowthChart = memo(({ data, height = 200 }) => {
  if (data.length < 2) return <div className="empty-chart">No data available</div>;

  const portfolioChange = data.length > 1 ?
  ((data[data.length - 1].portfolio - data[0].portfolio) / data[0].portfolio * 100).toFixed(1) :
  '0';
  const isUp = Number(portfolioChange) >= 0;

  return (
    <div style={{ width: '100%', marginTop: 6 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                <span className="mono" style={{
          fontSize: 11, fontWeight: 700,
          color: isUp ? T.accent.teal : T.accent.danger,
          background: isUp ? 'rgba(0,212,170,0.1)' : 'rgba(255,94,108,0.1)',
          padding: '2px 8px', borderRadius: 4
        }}>
                    {isUp ? '▲' : '▼'} {portfolioChange}%
                </span>
                <span style={{ fontSize: 10, color: T.text.tertiary }}>period return</span>
            </div>
            <ResponsiveContainer width="100%" height={height}>
                <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                        <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={T.accent.teal} stopOpacity={0.25} />
                            <stop offset="95%" stopColor={T.accent.teal} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<GrowthTooltip />} />
                    <Area type="monotone" dataKey="portfolio" stroke={T.accent.teal} strokeWidth={2}
          fill="url(#portfolioGrad)" dot={false} activeDot={{ r: 4, fill: T.accent.teal, stroke: '#080b12', strokeWidth: 2 }} />
                    <Area type="monotone" dataKey="benchmark" stroke={T.accent.gold} strokeWidth={1.5}
          fill="none" strokeDasharray="4 3" dot={false} opacity={0.5}
          activeDot={{ r: 3, fill: T.accent.gold, stroke: '#080b12', strokeWidth: 2 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>);

});

// ═══════════════════════════════════════════
// ALLOCATION TREEMAP — interactive with hover
// ═══════════════════════════════════════════






const TreemapContent = ({ x, y, width, height, depth, label, value, color, totalValue }) => {
  // depth 0 = internal root node Recharts creates — never render it
  if (depth !== 1) return null;
  if (width < 44 || height < 32) return null;

  const pct = totalValue > 0 ? (value / totalValue * 100).toFixed(1) : '0';
  const showValue = width > 72 && height > 52;

  const cx = x + width / 2;
  const cy = y + height / 2;
  const labelFs = width > 90 ? 12 : 10;
  const pctFs   = width > 90 ? 14 : 11;
  const valFs   = 9;
  const gap     = 5; // px between baselines

  // Centre the whole text group around cy
  let labelY, pctY, valueY;
  if (showValue) {
    const blockH = labelFs + gap + pctFs + gap + valFs;
    labelY = cy - blockH / 2 + labelFs;
    pctY   = labelY + gap + pctFs;
    valueY = pctY   + gap + valFs;
  } else {
    const blockH = labelFs + gap + pctFs;
    labelY = cy - blockH / 2 + labelFs;
    pctY   = labelY + gap + pctFs;
  }

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} rx={6}
        fill={`${color}20`} stroke={`${color}50`} strokeWidth={1.5}
        style={{ transition: 'all 0.2s', cursor: 'pointer' }} />
      <text x={cx} y={labelY} textAnchor="middle"
        fill={color} fontSize={labelFs} fontWeight={700}>
        {label}
      </text>
      <text x={cx} y={pctY} textAnchor="middle"
        fill={T.text.primary} fontSize={pctFs} fontWeight={800}
        fontFamily="'Roboto Mono', monospace"
        style={{ fontVariantNumeric: 'tabular-nums' }}>
        {pct}%
      </text>
      {showValue && (
        <text x={cx} y={valueY} textAnchor="middle"
          fill={T.text.tertiary} fontSize={valFs}
          fontFamily="'Roboto Mono', monospace">
          {fmt(value, 'INR')}
        </text>
      )}
    </g>
  );
};

export const AllocationPie = memo(({ data, height = 180 }) => {
  if (data.length === 0) {
    return (
      <div className="empty-state-small">
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.3 }}>📊</div>
                <div style={{ fontSize: 12, color: T.text.tertiary }}>No holdings to display</div>
            </div>);

  }

  const total = data.reduce((s, d) => s + d.value, 0);
  const treemapData = data.map((d) => ({
    name: d.label,
    size: d.value,
    label: d.label,
    value: d.value,
    color: d.color,
    totalValue: total
  }));

  return (
    <div style={{ width: '100%' }}>
            <ResponsiveContainer width="100%" height={height}>
                <Treemap
          data={treemapData}
          dataKey="size"
          aspectRatio={4 / 3}
          content={<TreemapContent />} />
        
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 12, padding: 0 }}>
                {data.map((d, i) =>
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: T.text.secondary, fontWeight: 600 }}>{d.label}</span>
                        <span className="mono" style={{ fontSize: 10, color: T.text.tertiary, fontVariantNumeric: 'tabular-nums' }}>
                            {(d.value / total * 100).toFixed(1)}%
                        </span>
                    </div>
        )}
            </div>
        </div>);

});

// ═══════════════════════════════════════════
// PROJECTION CHART — Recharts ComposedChart
// ═══════════════════════════════════════════












const ProjectionTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(8,11,18,0.95)', border: `1px solid ${T.border.medium}`,
      borderRadius: 8, padding: '10px 14px', backdropFilter: 'blur(12px)'
    }}>
            <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 4, fontWeight: 600 }}>{label}</div>
            {payload.map((p, i) =>
      <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.color || p.stroke }} />
                    <span style={{ fontSize: 10, color: T.text.secondary }}>{p.name}</span>
                    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: p.color || p.stroke, marginLeft: 'auto' }}>
                        {fmt(p.value, 'INR')}
                    </span>
                </div>
      )}
        </div>);

};

export const ProjectionChart = memo(({ months, base, bull, bear, confidenceLow, confidenceHigh, activeScenario, height = 200 }) => {
  if (base.length === 0) return null;

  const scenarioColor = activeScenario === 'bull' ? T.accent.teal : activeScenario === 'bear' ? T.accent.danger : T.accent.purple;

  const chartData = months.map((m, i) => ({
    month: m,
    base: base[i],
    bull: bull[i],
    bear: bear[i],
    confLow: confidenceLow[i],
    confHigh: confidenceHigh[i]
  }));

  return (
    <div style={{ width: '100%', marginTop: 6 }}>
            <ResponsiveContainer width="100%" height={height}>
                <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                    <defs>
                        <linearGradient id="confBandGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={scenarioColor} stopOpacity={0.12} />
                            <stop offset="95%" stopColor={scenarioColor} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false}
          tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<ProjectionTooltip />} />

                    {/* Confidence band */}
                    <Area type="monotone" dataKey="confHigh" stroke="none" fill="url(#confBandGrad)" dot={false} name="Upper Bound" />
                    <Area type="monotone" dataKey="confLow" stroke="none" fill={T.bg.base} dot={false} name="Lower Bound" />

                    {/* Scenario lines */}
                    {activeScenario !== 'bull' &&
          <Line type="monotone" dataKey="bull" stroke={T.accent.teal} strokeWidth={1}
          strokeDasharray="3 4" dot={false} opacity={0.25} name="Bull" />
          }
                    {activeScenario !== 'bear' &&
          <Line type="monotone" dataKey="bear" stroke={T.accent.danger} strokeWidth={1}
          strokeDasharray="3 4" dot={false} opacity={0.25} name="Bear" />
          }
                    {activeScenario !== 'base' &&
          <Line type="monotone" dataKey="base" stroke={T.accent.purple} strokeWidth={1}
          strokeDasharray="3 4" dot={false} opacity={0.25} name="Base" />
          }

                    {/* Active scenario */}
                    <Line type="monotone"
          dataKey={activeScenario}
          stroke={scenarioColor}
          strokeWidth={2.5}
          dot={false}
          activeDot={{ r: 4, fill: scenarioColor, stroke: '#080b12', strokeWidth: 2 }}
          name={activeScenario === 'bull' ? '🐂 Bull' : activeScenario === 'bear' ? '🐻 Bear' : '📊 Base'} />
          
                </ComposedChart>
            </ResponsiveContainer>
        </div>);

});

// ═══════════════════════════════════════════
// DRAWDOWN CHART — underwater plot
// ═══════════════════════════════════════════






export const DrawdownChart = memo(({ data, height = 140 }) => {
  if (data.length < 2) return null;
  const minDD = Math.min(...data.map((d) => d.drawdown));

  return (
    <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 5 }}>
                <defs>
                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={T.accent.danger} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={T.accent.danger} stopOpacity={0.05} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false}
        domain={[minDD - 1, 0.5]}
        tickFormatter={(v) => `${v.toFixed(0)}%`} />
                <Tooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            return (
              <div style={{
                background: 'rgba(8,11,18,0.95)', border: `1px solid ${T.border.medium}`,
                borderRadius: 8, padding: '8px 12px'
              }}>
                                <div style={{ fontSize: 10, color: T.text.tertiary, marginBottom: 3 }}>{label}</div>
                                <div className="mono" style={{ fontSize: 12, fontWeight: 700, color: T.accent.danger }}>
                                    {payload[0].value}%
                                </div>
                            </div>);

          }} />
        
                <Area type="monotone" dataKey="drawdown" stroke={T.accent.danger} strokeWidth={1.5}
        fill="url(#ddGrad)" dot={false}
        activeDot={{ r: 3, fill: T.accent.danger, stroke: '#080b12', strokeWidth: 2 }} />
            </AreaChart>
        </ResponsiveContainer>);

});

// ═══════════════════════════════════════════
// RISK-RETURN SCATTER — bubble chart
// ═══════════════════════════════════════════






export const RiskReturnScatter = memo(({ data, height = 200 }) => {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={height}>
            <ScatterChart margin={{ top: 10, right: 10, left: -10, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis type="number" dataKey="risk" name="Risk (Vol %)" unit="%"
        tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false}
        label={{ value: 'Risk (Volatility %)', position: 'insideBottom', offset: -5, fontSize: 9, fill: T.text.tertiary }} />
                <YAxis type="number" dataKey="returnPct" name="Return %"
        tick={{ fontSize: 9, fill: T.text.tertiary }} axisLine={false} tickLine={false}
        label={{ value: 'Return %', angle: -90, position: 'insideLeft', offset: 15, fontSize: 9, fill: T.text.tertiary }} />
                <ZAxis type="number" dataKey="value" range={[80, 400]} />
                <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{
                background: 'rgba(8,11,18,0.95)', border: `1px solid ${T.border.medium}`,
                borderRadius: 8, padding: '10px 14px'
              }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: d.color, marginBottom: 4 }}>{d.symbol}</div>
                                <div style={{ fontSize: 10, color: T.text.secondary, marginBottom: 2 }}>{d.sector}</div>
                                <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: T.text.tertiary }}>Risk</div>
                                        <div className="mono" style={{ fontSize: 11, color: T.accent.orange }}>{d.risk.toFixed(1)}%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: T.text.tertiary }}>Return</div>
                                        <div className="mono" style={{
                      fontSize: 11, color: d.returnPct >= 0 ? T.accent.teal : T.accent.danger
                    }}>{d.returnPct >= 0 ? '+' : ''}{d.returnPct.toFixed(1)}%</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: T.text.tertiary }}>Value</div>
                                        <div className="mono" style={{ fontSize: 11, color: T.text.primary }}>{fmt(d.value, 'INR')}</div>
                                    </div>
                                </div>
                            </div>);

          }} />
        
                <Scatter name="Holdings" data={data}>
                    {data.map((entry, i) =>
          <Cell key={i} fill={entry.color} fillOpacity={0.8} stroke={entry.color} strokeWidth={1} />
          )}
                </Scatter>
            </ScatterChart>
        </ResponsiveContainer>);

});

// ═══════════════════════════════════════════
// HEALTH RING — animated SVG gauge
// ═══════════════════════════════════════════








export const HealthRing = memo(({ score, color, size = 100, label }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - animatedScore / 100 * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timer);
  }, [score]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
            <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)' }} />
        
            </svg>
            <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)', textAlign: 'center'
      }}>
                <div className="mono" style={{ fontSize: size * 0.24, fontWeight: 800, color }}>{score}</div>
                {label && <div style={{ fontSize: size * 0.1, color: T.text.tertiary, fontWeight: 600, marginTop: 1 }}>{label}</div>}
            </div>
        </div>);

});

// ═══════════════════════════════════════════
// HEATMAP — sector allocation heatmap
// ═══════════════════════════════════════════





export const HeatmapChart = memo(({ data }) => {
  if (data.length === 0) return null;
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  return (
    <div className="heatmap-grid">
            {data.map((d, i) => {
        const pct = d.value / total * 100;
        return (
          <div
            key={i}
            className="heatmap-cell"
            style={{
              background: `${d.color}18`,
              borderColor: `${d.color}40`,
              flex: `${Math.max(pct, 15)} 0 0`
            }}>
            
                        <div style={{ fontSize: 11, fontWeight: 700, color: d.color }}>{d.label}</div>
                        <div className="mono" style={{ fontSize: 13, fontWeight: 800, color: T.text.primary, marginTop: 4 }}>
                            {pct.toFixed(1)}%
                        </div>
                        <div className="mono" style={{ fontSize: 10, color: T.text.tertiary, marginTop: 2 }}>
                            {fmt(d.value, 'INR')}
                        </div>
                    </div>);

      })}
        </div>);

});

// ═══════════════════════════════════════════
// MINI SPARKLINE (kept small for table rows)
// ═══════════════════════════════════════════

export const MiniSparkline = memo(({ data, color }) => {
  if (data.length <= 1) return <div style={{ width: 80, height: 1, background: T.border.subtle }} />;
  const max = Math.max(...data),min = Math.min(...data),r = max - min || 1;
  const pts = data.map((v, i) => `${i / (data.length - 1) * 100},${100 - (v - min) / r * 80}`).join(' ');
  return (
    <svg viewBox="0 0 100 100" style={{ width: 80, height: 32 }} preserveAspectRatio="none">
            <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>);

});