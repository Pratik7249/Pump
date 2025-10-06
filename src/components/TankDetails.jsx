import React, { useMemo } from 'react';

function rssiToBars(rssi) {
  if (rssi >= -40) return 5;
  if (rssi >= -55) return 4;
  if (rssi >= -70) return 3;
  if (rssi >= -90) return 2;
  if (rssi >= -110) return 1;
  return 0;
}
function rssiColor(rssi) {
  if (rssi >= -40) return '#16a34a';
  if (rssi >= -55) return '#84cc16';
  if (rssi >= -70) return '#eab308';
  if (rssi >= -90) return '#f59e0b';
  return '#ef4444';
}
function SignalBars({ rssi }) {
  const bars = rssiToBars(rssi);
  const color = rssiColor(rssi);
  const heights = [8, 12, 16, 20, 24];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3 }}>
      {heights.map((h, i) => (
        <div key={i}
          style={{
            width: 6, height: h, borderRadius: 2,
            background: i < bars ? color : '#e5e7eb',
            boxShadow: i < bars ? '0 1px 4px rgba(0,0,0,0.12)' : 'none'
          }}
          title={`RSSI ${rssi} dBm`}
        />
      ))}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{
        fontWeight: 800, textAlign: 'right', minWidth: 64,
        fontVariantNumeric: 'tabular-nums', fontFeatureSettings: '"tnum" 1, "lnum" 1'
      }}>
        {value}
      </span>
    </div>
  );
}

export default function TankDetails({ pct, litersText, capacity, lowLevelPct, highLevelPct, rssi }) {
  const flags = useMemo(() => ({
    low: pct <= lowLevelPct,
    high: pct >= highLevelPct
  }), [pct, lowLevelPct, highLevelPct]);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>Current Level</div>
        <div style={{ fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{litersText}</div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
        {flags.low && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
            background: 'rgba(239,68,68,0.12)', color: '#991b1b',
            border: '1px solid rgba(239,68,68,0.35)'
          }}>LOW LEVEL</span>
        )}
        {flags.high && (
          <span style={{
            fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 999,
            background: 'rgba(34,197,94,0.12)', color: '#065f46',
            border: '1px solid rgba(34,197,94,0.35)'
          }}>NEAR FULL</span>
        )}
      </div>

      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8, marginBottom: 2 }}></div>
      <div style={{ display: 'grid', rowGap: 8 }}>
        <Row label="Motor Status" value={``}/>
        <Row label="Sump tank level" value={`${pct.toFixed(1)}%`} />
        <Row label="Sump capacity" value={`${capacity.toLocaleString()} L`} />
        <Row
          label="RSSI"
          value={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SignalBars rssi={rssi} />
              <span style={{ fontWeight: 800, color: rssiColor(rssi), minWidth: 64, textAlign: 'right' }}>
                {rssi} dBm
              </span>
            </div>
          }
        />
      </div>
    </div>
  );
}
