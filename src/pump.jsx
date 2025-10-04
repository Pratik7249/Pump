import React, { useEffect, useMemo, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart, EffectScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  ToolboxComponent,
  GraphicComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  LineChart,
  EffectScatterChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent,
  ToolboxComponent,
  GraphicComponent,
  CanvasRenderer
]);

/**
 * TankPumpPanel — responsive pump ➜ single pipe ➜ rectangular tank + dual-axis chart
 * - Pump has LED: green (ON) / red (OFF)
 * - Single connected pipe path with rounded elbow; animated flow when ON
 * - Rectangular tank
 */
export default function TankPumpPanel({
  capacity = 2000,
  level,                 // optional (controlled)
  motorOn,               // optional (controlled)
  onToggle,              // optional callback(next:boolean)
  flowInLpm = 120,
  outflowLpm = 20,
  history = [],
  height = 680,
  theme = 'light',
  showBands = false,     // shaded ON/OFF bands (off by default)
  pumpImage = '/pump.png' // or '/pump.png'
}) {
  // Responsive breakpoint
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1100);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Internal state (demo mode)
  const [uncontrolled, setUncontrolled] = useState({
    level: level ?? Math.round(capacity * 0.45),
    motorOn: motorOn ?? false,
  });

  // Local demo flows (only used when uncontrolled)
  const [localFlowIn, setLocalFlowIn] = useState(flowInLpm);
  const [localOutflow, setLocalOutflow] = useState(outflowLpm);

  const isControlled = level !== undefined && motorOn !== undefined;
  const curr = {
    level: isControlled ? Math.min(capacity, Math.max(0, level)) : uncontrolled.level,
    motorOn: isControlled ? !!motorOn : uncontrolled.motorOn,
  };
  const effectiveInflow = isControlled ? flowInLpm : localFlowIn;
  const effectiveOutflow = isControlled ? outflowLpm : localOutflow;

  const [seriesData, setSeriesData] = useState(() => {
    const now = Date.now();
    if (history?.length) return [...history];
    const seed = [];
    for (let i = 12; i >= 1; i--) {
      const ts = now - i * 150000; // 2.5 min
      const lvl = Math.round(capacity * (0.35 + 0.01 * (i % 7)));
      seed.push({ ts, level: lvl, motor: i % 3 === 0 });
    }
    seed.push({ ts: now - 60000, level: Math.round(capacity * 0.46), motor: false });
    return seed;
  });

  // Demo tick
  useEffect(() => {
    if (isControlled) return;
    const id = setInterval(() => {
      setUncontrolled((prev) => {
        const dirLps = prev.motorOn ? effectiveInflow / 60 : -effectiveOutflow / 60;
        const nextLevel = Math.max(0, Math.min(capacity, prev.level + dirLps));
        const point = { ts: Date.now(), level: nextLevel, motor: prev.motorOn };
        setSeriesData((arr) => [...arr.slice(-1800), point]);
        return { ...prev, level: nextLevel };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isControlled, effectiveInflow, effectiveOutflow, capacity]);

  // Keyboard toggle (M)
  useEffect(() => {
    const onKey = (e) => { if ((e.key || '').toLowerCase() === 'm') handleToggle(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Toggle
  const handleToggle = useCallback(() => {
    if (isControlled) {
      onToggle?.(!motorOn);
    } else {
      setUncontrolled((p) => ({ ...p, motorOn: !p.motorOn }));
      setSeriesData((arr) => [...arr, { ts: Date.now(), level: curr.level, motor: !curr.motorOn }]);
    }
  }, [isControlled, onToggle, motorOn, curr.level, curr.motorOn]);

  // Mirror controlled props into chart
  useEffect(() => {
    if (!isControlled) return;
    setSeriesData((arr) => [...arr, { ts: Date.now(), level: curr.level, motor: curr.motorOn }]);
  }, [isControlled, curr.level, curr.motorOn]);

  const pct = useMemo(() => (capacity ? (curr.level / capacity) * 100 : 0), [curr.level, capacity]);
  const litersText = useMemo(() => `${Math.round(curr.level).toLocaleString()} L`, [curr.level]);

  // ===== Chart =====
  const chartOption = useMemo(() => {
    const levelData = seriesData.map((d) => [d.ts, d.level]);
    const motorData = seriesData.map((d) => [d.ts, d.motor ? 1 : 0]);

    // Optional ON/OFF shaded spans
    const spans = [];
    if (showBands && seriesData.length > 1) {
      let start = seriesData[0].ts;
      let state = seriesData[0].motor;
      for (let i = 1; i < seriesData.length; i++) {
        if (seriesData[i].motor !== state) {
          spans.push([
            { xAxis: new Date(start) },
            { xAxis: new Date(seriesData[i - 1].ts),
              itemStyle: { color: state ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)' } },
          ]);
          start = seriesData[i].ts;
          state = seriesData[i].motor;
        }
      }
      spans.push([
        { xAxis: new Date(start) },
        { xAxis: new Date(seriesData[seriesData.length - 1].ts),
          itemStyle: { color: state ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)' } },
      ]);
    }

    return {
      animation: true,
      legend: { top: 4, data: ['Water Level', 'Motor'] },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'line' },
        formatter: (params) => {
          const t = echarts.format.formatTime('hh:mm', params[0].value[0]);
          const parts = [`<div style="margin-bottom:4px;"><b>${t}</b></div>`];
          params.forEach(p => {
            if (p.seriesName === 'Water Level') {
              parts.push(`${p.marker} ${p.seriesName}: <b>${Math.round(p.value[1])} L</b>`);
            } else {
              parts.push(`${p.marker} ${p.seriesName}: <b>${p.value[1] ? 'ON' : 'OFF'}</b>`);
            }
          });
          return parts.join('<br/>');
        }
      },
      grid: { top: 30, right: 24, bottom: 64, left: 80 },
      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: { formatter: (v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
      },
      yAxis: [
        { type: 'value', name: 'Water Level (L)', min: 0, max: capacity, splitNumber: 5 },
        {
          type: 'value', name: '', min: 0, max: 1, interval: 1,
          axisLabel: { formatter: () => '' }, splitLine: { show: false }
        }
      ],
      dataZoom: [
        { type: 'inside', throttle: 50 },
        { type: 'slider', height: 18, bottom: 12 }
      ],
      series: [
        {
          name: 'Water Level',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          showSymbol: false,
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: theme === 'dark' ? 'rgba(59,130,246,0.35)' : 'rgba(59,130,246,0.22)' },
              { offset: 1, color: 'rgba(59,130,246,0.02)' },
            ]),
          },
          lineStyle: { width: 2 },
          data: levelData,
          ...(showBands ? { markArea: { silent: true, data: spans } } : {})
        },
        {
          name: 'Motor',
          type: 'line',
          step: 'end',
          yAxisIndex: 1,
          symbol: 'none',
          lineStyle: { width: 1.8 },
          areaStyle: { opacity: 0.15 },
          data: motorData,
        },
        {
          name: 'Current',
          type: 'effectScatter',
          symbolSize: 9,
          rippleEffect: { brushType: 'stroke' },
          yAxisIndex: 0,
          data: levelData.length ? [levelData[levelData.length - 1]] : [],
        }
      ],
      toolbox: {
        feature: { saveAsImage: { title: 'PNG' }, dataZoom: { yAxisIndex: 'none' }, restore: {} },
        right: 12,
      },
    };
  }, [seriesData, capacity, theme, showBands]);

  // ===== Styles (responsive + overflow-safe) =====
  const styles = useMemo(() => ({
    wrapper: {
      display: 'grid',
      gridTemplateRows: `${Math.max(360, Math.floor(height * 0.54))}px 1fr`,
      gap: 16,
      height,
      width: '100%',
      overflow: 'auto'
    },
    top: {
      position: 'relative',
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      padding: 12,
      overflow: 'hidden',
      background: '#fff'
    },
    bottom: {
      borderRadius: 16,
      border: '1px solid #e5e7eb',
      background: '#fff',
      overflow: 'hidden',
      minHeight: 300
    },
    headerRow: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '4px 4px 8px 4px',
      flexWrap: 'wrap'
    },
    title: { fontSize: 16, fontWeight: 700, color: '#0f172a' },
    ctrlRow: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    toggleBtn: (on) => ({
      padding: '10px 14px',
      borderRadius: 999,
      fontWeight: 700,
      fontSize: 13,
      cursor: 'pointer',
      background: on ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f97316)',
      color: 'white',
      border: 'none',
      boxShadow: '0 6px 14px rgba(0,0,0,0.08)'
    }),
    stat: { fontSize: 13, color: '#475569' },
    bigStage: {
      height: 'calc(100% - 8px)',
      display: 'grid',
      gridTemplateColumns: isNarrow ? '1fr' : 'minmax(560px,1fr) 360px',
      gridAutoRows: 'minmax(280px, auto)',
      gap: 16,
      alignItems: 'stretch'
    },
    diagramFrame: {
      minHeight: 320,
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      background: '#fff',
      overflow: 'hidden',
      display: 'flex'
    },
    meterCard: {
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      padding: 14,
      background: 'linear-gradient(180deg, #f9fafb, #ffffff)'
    },
    meterLabel: { fontSize: 12, color: '#6b7280', marginBottom: 6 },
    meterRead: { fontSize: 32, fontWeight: 800, lineHeight: 1 },
    meterPct: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  }), [height, isNarrow]);

  // ===== SVG Diagram (single connected pipe + rectangular tank) =====
const Diagram = () => {
  // --- Layout tuned for any screen via viewBox ---
  const pump = { x: 70, y: 110, w: 200, h: 140 };      // pump image box
  const led  = { r: 14, x: pump.x + 22, y: pump.y + 22 }; // LED at top-left of pump
  const pipeW = 18;                                     // pipe thickness

  // Outlet point (right-middle of pump); tweak yFactor if your icon's nozzle sits higher/lower
  const outlet = { x: pump.x + pump.w - 6, y: pump.y + pump.h * 0.54 };

  // Rectangular tank
  const tank =  { x: 720, y: 55, w: 220, h: 250 };
  const inner = { x: tank.x + 6, y: tank.y + 6, w: tank.w - 12, h: tank.h - 12 };

  // Water level
  const waterH = Math.max(0, Math.min(inner.h, (pct / 100) * inner.h));
  const waterY = inner.y + (inner.h - waterH);

  // Single continuous pipe path: outlet -> near tank -> up elbow -> into tank lip
  const elbowX   = tank.x - 44;             // where the elbow starts curving up
  const inletY   = inner.y + 2;             // top inside of tank (lip)
  const pipePath = `
    M ${outlet.x} ${outlet.y}
    H ${elbowX}
    Q ${tank.x} ${outlet.y} ${tank.x} ${inletY}
    H ${inner.x + 10}
  `;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 1000 360"
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id="steel" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <linearGradient id="water" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>

        {/* dashed stroke animation for flow */}
        <style>{`@keyframes dashflow { to { stroke-dashoffset: -220; } }`}</style>

        {/* clip the pump image to a rounded white backplate */}
        <clipPath id="pumpClip">
          <rect x={pump.x} y={pump.y} width={pump.w} height={pump.h} rx="14" ry="14" />
        </clipPath>

        {/* clip for tank inner cavity */}
        <clipPath id="tankClip">
          <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx="6" ry="6" />
        </clipPath>
      </defs>

      {/* ===== PIPE (one continuous path) ===== */}
      <path
        d={pipePath}
        fill="none"
        stroke="#94a3b8"
        strokeOpacity="0.65"
        strokeWidth={pipeW}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* hide any tiny seam at the outlet */}
      <circle cx={outlet.x} cy={outlet.y} r={pipeW / 2} fill="#94a3b8" opacity="0.65" />

      {/* animated flow overlay when motor is ON */}
      {curr.motorOn && (
        <path
          d={pipePath}
          fill="none"
          stroke="#60a5fa"
          strokeWidth={Math.max(8, pipeW - 10)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ strokeDasharray: '26 18', animation: 'dashflow 1.1s linear infinite' }}
        />
      )}

      {/* ===== PUMP with LED ===== */}
      {/* white backplate to kill checkerboard artifacts */}
      <rect x={pump.x} y={pump.y} width={pump.w} height={pump.h} rx="14" fill="#fff" />
      {pumpImage ? (
        <image
          href={pumpImage}
          x={pump.x}
          y={pump.y}
          width={pump.w}
          height={pump.h}
          preserveAspectRatio="xMidYMid meet"
          clipPath="url(#pumpClip)"
        />
      ) : (
        <rect x={pump.x} y={pump.y} width={pump.w} height={pump.h} rx="14" fill="url(#steel)" opacity="0.7" />
      )}

      {/* LED: green ON, red OFF (pulses softly when ON) */}
      <circle
        cx={led.x}
        cy={led.y}
        r={led.r}
        fill={curr.motorOn ? '#16a34a' : '#ef4444'}
        stroke="#ffffff"
        strokeWidth="2"
      />
      {curr.motorOn && (
        <circle
          cx={led.x}
          cy={led.y}
          r={led.r + 6}
          fill="none"
          stroke="#16a34a"
          strokeOpacity="0.45"
          strokeWidth="3"
        >
          <animate attributeName="r" values={`${led.r + 3};${led.r + 8};${led.r + 3}`} dur="1.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.55;0.15;0.55" dur="1.4s" repeatCount="indefinite" />
        </circle>
      )}

      {/* ===== RECTANGULAR TANK ===== */}
      <rect x={tank.x} y={tank.y} width={tank.w} height={tank.h} rx="6" fill="url(#steel)" opacity="0.35" />
      <rect x={inner.x} y={inner.y} width={inner.w} height={inner.h} rx="6" fill="#f1f5f9" stroke="#e2e8f0" />
      <g clipPath="url(#tankClip)">
        <rect x={inner.x} y={waterY} width={inner.w} height={waterH} fill="url(#water)" />
        {waterH > 6 && (
          <path d={`M ${inner.x + 10} ${waterY + 6} H ${inner.x + inner.w - 10}`} stroke="rgba(255,255,255,0.9)" strokeWidth="2" />
        )}
      </g>
      <text x={tank.x + tank.w / 2} y={tank.y + tank.h + 22} textAnchor="middle" fontSize="13" fill="#64748b">
        Water Tank
      </text>
    </svg>
  );
};

  return (
    <div style={styles.wrapper}>
      <div style={styles.top}>
        <div style={styles.headerRow}>
          <div style={styles.title}>Pump ▶ Pipe ▶ Tank</div>
          <div style={styles.ctrlRow}>
            <button onClick={handleToggle} style={styles.toggleBtn(curr.motorOn)}>
              {curr.motorOn ? 'Turn OFF (M)' : 'Turn ON (M)'}
            </button>
            <div style={styles.stat}>
              Level: <b>{litersText}</b> • {pct.toFixed(1)}% of {capacity.toLocaleString()} L
            </div>
          </div>
        </div>

        {/* Diagram + meters (responsive, no overlap) */}
        <div style={styles.bigStage}>
          <div style={styles.diagramFrame}>
            <Diagram />
          </div>

          <div style={styles.meterCard}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div>
                <div style={styles.meterLabel}>Current Level</div>
                <div style={styles.meterRead}>{litersText}</div>
                <div style={styles.meterPct}>{pct.toFixed(1)}% of capacity</div>
              </div>

              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Motor Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 999, background: curr.motorOn ? '#10b981' : '#ef4444' }} />
                <div style={{ fontWeight: 700, color: curr.motorOn ? '#065f46' : '#7f1d1d' }}>
                  {curr.motorOn ? 'ON' : 'OFF'}
                </div>
              </div>

              {/* Sliders work in demo (uncontrolled) mode */}
              <div style={styles.meterLabel}>Inflow (when ON)</div>
              <input
                type="range" min="10" max="300" step="5"
                value={isControlled ? flowInLpm : localFlowIn}
                onChange={(e) => !isControlled && setLocalFlowIn(Number(e.target.value))}
                style={{ width: '100%' }}
                disabled={isControlled}
              />
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {isControlled ? flowInLpm : localFlowIn} L/min
              </div>

              <div style={{ ...styles.meterLabel, marginTop: 6 }}>Outflow (when OFF)</div>
              <input
                type="range" min="0" max="120" step="5"
                value={isControlled ? outflowLpm : localOutflow}
                onChange={(e) => !isControlled && setLocalOutflow(Number(e.target.value))}
                style={{ width: '100%' }}
                disabled={isControlled}
              />
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {isControlled ? outflowLpm : localOutflow} L/min
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={styles.bottom}>
        <ReactECharts notMerge style={{ height: '100%', width: '100%' }} option={chartOption} />
      </div>
    </div>
  );
}
