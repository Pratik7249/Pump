import React, { useEffect, useMemo, useState, useCallback } from 'react';
import TankHeader from './components/TankHeader';
import TankFooter from './components/TankFooter';
import TankDiagram from './components/TankDiagram';
import TankDetails from './components/TankDetails';
import TankChart from './components/TankChart';

export default function TankDashboard({
  capacity = 2000,
  level,
  motorOn,
  onToggle,
  flowInLpm = 120,
  outflowLpm = 20,
  history = [],
  theme = 'light',
  showBands = false,
  pumpImage = '/pump.png',
  rssi = -58,
  lowLevelPct = 20,
  highLevelPct = 95,
  showThresholds = true
}) {
  const [isNarrow, setIsNarrow] = useState(() => window.innerWidth < 1100);
  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1100);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const [uncontrolled, setUncontrolled] = useState({
    level: level ?? Math.round(capacity * 0.45),
    motorOn: motorOn ?? false,
  });

  const isControlled = level !== undefined && motorOn !== undefined;
  const curr = {
    level: isControlled ? Math.min(capacity, Math.max(0, level)) : uncontrolled.level,
    motorOn: isControlled ? !!motorOn : uncontrolled.motorOn,
  };

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

  useEffect(() => {
    if (isControlled) return;
    const id = setInterval(() => {
      setUncontrolled((prev) => {
        const dirLps = prev.motorOn ? flowInLpm / 60 : -outflowLpm / 60;
        const nextLevel = Math.max(0, Math.min(capacity, prev.level + dirLps));
        const point = { ts: Date.now(), level: nextLevel, motor: prev.motorOn };
        setSeriesData((arr) => [...arr.slice(-1800), point]);
        return { ...prev, level: nextLevel };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isControlled, flowInLpm, outflowLpm, capacity]);

  useEffect(() => {
    const onKey = (e) => { if ((e.key || '').toLowerCase() === 'm') handleToggle(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const handleToggle = useCallback(() => {
    if (isControlled) {
      onToggle?.(!motorOn);
    } else {
      setUncontrolled((p) => ({ ...p, motorOn: !p.motorOn }));
      setSeriesData((arr) => [...arr, { ts: Date.now(), level: curr.level, motor: !curr.motorOn }]);
    }
  }, [isControlled, onToggle, motorOn, curr.level, curr.motorOn]);

  useEffect(() => {
    if (!isControlled) return;
    setSeriesData((arr) => [...arr, { ts: Date.now(), level: curr.level, motor: curr.motorOn }]);
  }, [isControlled, curr.level, curr.motorOn]);

  const pct = useMemo(() => (capacity ? (curr.level / capacity) * 100 : 0), [curr.level, capacity]);
  const litersText = useMemo(() => `${Math.round(curr.level).toLocaleString()} L`, [curr.level]);

  // Layout constants
  const headerH = 52;
  const footerH = 28;
  const pad = 12;
  const gap = 12;
  const topRowH = 290;

  const styles = useMemo(() => ({
    wrapper: {
      height: '100%',
      width: '100%',
      display: 'grid',
      gridTemplateRows: ` ${headerH}px minmax(0, 1fr) ${footerH}px`, // middle row never overflows
      background: '#f8fafc',
      overflow: 'hidden'
    },
    main: {
      height: '100%',
      padding: pad,
      overflow: 'hidden',
      boxSizing: 'border-box' // include padding in height to avoid pushing footer
    },
    grid: {
      height: '100%',
      display: 'grid',
      gridTemplateColumns: isNarrow ? '1fr' : 'minmax(520px,1fr) 360px',
      gridTemplateRows: isNarrow ? ` ${topRowH}px 1fr` : ` ${topRowH}px 1fr`,
      gap
    },
    card: {
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      background: '#fff',
      display: 'flex',
      overflow: 'hidden'
    }
  }), [isNarrow]);

  return (
    <div style={styles.wrapper}>
      <TankHeader onToggle={handleToggle} motorOn={!!curr.motorOn} />

      <div style={styles.main}>
        <div style={styles.grid}>
          <div style={{ ...styles.card, overflow: 'visible', height: topRowH }}>
            <TankDiagram
              capacity={capacity}
              levelLiters={curr.level}
              motorOn={!!curr.motorOn}
              theme={theme}
              pumpImage={'/pump.png'}
            />
          </div>

          <div style={{ ...styles.card, padding: 12, background: 'linear-gradient(180deg, #f9fafb, #ffffff)', height: topRowH }}>
            <TankDetails
              pct={pct}
              litersText={litersText}
              capacity={capacity}
              lowLevelPct={lowLevelPct}
              highLevelPct={highLevelPct}
              rssi={-58}
              motorOn={curr.motorOn}
            />
          </div>

          <div style={{ ...styles.card, gridColumn: isNarrow ? '1' : '1 / span 2', minHeight: 160, height: '100%' }}>
            <TankChart
              capacity={capacity}
              seriesData={seriesData}
              theme={theme}
              showBands={showBands}
              showThresholds={showThresholds}
              lowAbs={(lowLevelPct / 100) * capacity}
              highAbs={(highLevelPct / 100) * capacity}
              height="100%"
            />
          </div>
        </div>
      </div>

      <TankFooter />
    </div>
  );
}
