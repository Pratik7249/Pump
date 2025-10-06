import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts/core';
import { LineChart, EffectScatterChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  MarkAreaComponent
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
  CanvasRenderer
]);

export default function TankChart({
  capacity,
  seriesData,
  theme = 'light',
  showBands = false,
}) {
  const option = useMemo(() => {
    const levelData = seriesData.map(d => [d.ts, d.level]).sort((a,b)=>a[0]-b[0]);
    const motorData = seriesData.map(d => [d.ts, d.motor ? 1 : 0]).sort((a,b)=>a[0]-b[0]);

    // optional ON/OFF bands
    const spans = [];
    if (showBands && seriesData.length > 1) {
      let start = seriesData[0].ts;
      let state = seriesData[0].motor;
      for (let i = 1; i < seriesData.length; i++) {
        if (seriesData[i].motor !== state) {
          spans.push([
            { xAxis: new Date(start) },
            { xAxis: new Date(seriesData[i - 1].ts), itemStyle: { color: state ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)' } }
          ]);
          start = seriesData[i].ts;
          state = seriesData[i].motor;
        }
      }
      spans.push([
        { xAxis: new Date(start) },
        { xAxis: new Date(seriesData[seriesData.length - 1].ts), itemStyle: { color: state ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.05)' } }
      ]);
    }

    // ---- helpers for tooltip at ANY timestamp ----
    const interpLevel = (ts) => {
      if (!levelData.length) return null;
      if (ts <= levelData[0][0]) return levelData[0][1];
      if (ts >= levelData[levelData.length-1][0]) return levelData[levelData.length-1][1];
      // binary search
      let lo = 0, hi = levelData.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        (levelData[mid][0] <= ts ? lo = mid : hi = mid);
      }
      const [x1, y1] = levelData[lo];
      const [x2, y2] = levelData[hi];
      const t = (ts - x1) / (x2 - x1);
      return y1 + (y2 - y1) * t; // linear interpolation
    };
    const motorAt = (ts) => {
      if (!motorData.length) return 0;
      // last known state at/under ts
      let lo = 0, hi = motorData.length - 1;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        (motorData[mid][0] <= ts ? lo = mid : hi = mid);
      }
      return ts < motorData[0][0] ? motorData[0][1] : motorData[lo][1];
    };

    return {
      animation: false,
      legend: { top: 18, data: ['Water Level', 'Motor'] },
      toolbox: { show: false },

      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove',
        alwaysShowContent: false,
        axisPointer: {
          type: 'line',
          snap: false,                                  // <-- free hover (not restricted to points)
          lineStyle: { color: 'rgba(51,65,85,0.45)', width: 2, type: 'solid' }
        },
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        textStyle: { color: '#0f172a' },
        padding: [8, 10],
        formatter: (raw) => {
          // Use the pointer's axis value (not the nearest point)
          const ts = raw?.[0]?.axisValue ?? raw?.[0]?.value?.[0];
          const lvl = interpLevel(ts);
          const motor = motorAt(ts);
          const dt = new Date(ts);
          const dateStr = dt.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' });
          const timeStr = dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          return [
            `<div style="margin-bottom:4px;"><b>${dateStr} ${timeStr}</b></div>`,
            `<span style="color:#3b82f6;">●</span> Water Level: <b>${Math.round(lvl)} L</b>`,
            `<span style="color:#22c55e;">●</span> Motor: <b>${motor ? 'ON' : 'OFF'}</b>`
          ].join('<br/>');
        }
      },

      grid: { top: 74, right: 28, bottom: 74, left: 80 },

      xAxis: {
        type: 'time',
        boundaryGap: false,
        axisLabel: {
          color: '#64748b',
          margin: 14,
          formatter: v => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        axisPointer: { label: { show: false } } // hide gray label under axis
      },

      yAxis: [
        {
          type: 'value',
          name: 'Water Level (L)',
          min: 0,
          max: capacity,
          splitNumber: 5,
          axisLabel: { color: '#64748b' },
          axisPointer: { label: { show: false } }
        },
        {
          type: 'value',
          min: 0,
          max: 1,
          interval: 1,
          axisLabel: { formatter: () => '' },
          splitLine: { show: false },
          axisPointer: { label: { show: false } }
        }
      ],

      dataZoom: [
        { type: 'inside', throttle: 50, zoomOnMouseWheel: true, moveOnMouseMove: true }
      ],

      series: [
        {
          id: 'level',
          name: 'Water Level',
          type: 'line',
          smooth: true,
          yAxisIndex: 0,
          showSymbol: false,
          lineStyle: { width: 2 },
          data: levelData,
          ...(showBands ? { markArea: { silent: true, data: spans } } : {})
        },
        {
          id: 'motor',
          name: 'Motor',
          type: 'line',
          step: 'end',
          yAxisIndex: 1,
          symbol: 'none',
          lineStyle: { width: 1.8 },
          areaStyle: { opacity: 0.12 },
          data: motorData
        },
        {
          id: 'cursor',
          name: 'Current',
          type: 'effectScatter',
          symbolSize: 8,
          tooltip: { show: false },
          yAxisIndex: 0,
          data: levelData.length ? [levelData[levelData.length - 1]] : []
        }
      ]
    };
  }, [seriesData, capacity, theme, showBands]);

  const onEvents = useMemo(() => ({
    globalout: (_e, chart) => { try { chart?.dispatchAction({ type: 'hideTip' }); } catch {} }
  }), []);

  return (
    <ReactECharts
      option={option}
      notMerge={false}
      lazyUpdate
      onEvents={onEvents}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
