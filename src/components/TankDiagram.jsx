import React, { useMemo } from 'react';

export default function TankDiagram({
  capacity,
  levelLiters,
  motorOn,
  theme = 'light',
  pumpImage = '/pump.png',
  viewBox = '0 0 1000 360'
}) {
  const pct = useMemo(() => (capacity ? Math.max(0, Math.min(100, (levelLiters / capacity) * 100)) : 0), [capacity, levelLiters]);
  const [vbX, vbY, vbW, vbH] = useMemo(() => viewBox.split(' ').map(Number), [viewBox]);

  // Layout
  const pump = { x: 60, y: 120, w: 220, h: 150 };
  const tank = { x: 660, y: 40, w: 300, h: 270 };
  const standH = 44;

  // Cylinder geometry
  const rx = Math.round(tank.w / 2);
  const ry = 24;
  const wall = 12;
  const topY = tank.y + ry;
  const botY = tank.y + tank.h - ry;
  const innerLeft  = tank.x + wall;
  const innerRight = tank.x + tank.w - wall;
  const innerRx = rx - wall;
  const innerRy = ry - Math.max(4, wall * 0.45);
  const innerH = botY - topY;

  // Water
  const waterH = (pct / 100) * innerH;
  const waterTopY = botY - waterH;

  // Theme palette
  const dark = theme === 'dark';
  const shellA = dark ? '#5b636f' : '#b8c2cc';
  const shellB = dark ? '#3f4752' : '#8e9aa8';
  const innerTint = dark ? '#718096' : '#d6dde5';
  const rimStroke = dark ? '#9aa6b2' : '#8fa1b2';
  const pipeOuter = dark ? '#7e8a98' : '#8b98ab';
  const pipeInner = dark ? '#c1ccd8' : '#dbe3eb';
  const waterTop = dark ? '#3b82f6' : '#5ea9ff';
  const waterBot = dark ? '#1e40af' : '#2563eb';
  const labelColor = dark ? '#e5e7eb' : '#64748b';

  // ----- PIPE (strict 90° bends, safe top) -----
  const pipeW   = 16;
  const SAFE_TOP = 18;                                  // min clearance from viewBox top
  const pumpUp = {                                     // upward-facing outlet on pump top
    x: pump.x + Math.round(pump.w * 0.62) - 70 ,
    y: pump.y + 10
  };
  const horizY = Math.max(topY - 16, vbY + SAFE_TOP + pipeW / 2);  // horizontal run (safe)
  // Inlet ring near the top-left corner (separate from manhole)
  const inletX = tank.x + Math.round(tank.w * 0.22);
  const inletY = topY - 4;

  // Centerline polyline: up from pump → right above tank → drop into inlet
  // (Pure H/V segments = crisp 90° corners)
  const pipePath =
    `M ${pumpUp.x} ${pumpUp.y} ` +
    `V ${horizY} ` +
    `H ${inletX} ` +
    `V ${inletY}`;

  // Overflow (visual)
  const ofY = topY + 4;
  const ofX = tank.x + tank.w - wall - 8;

  // Inner cavity clip
  const innerClipPath = `
    M ${innerLeft} ${topY}
    A ${innerRx} ${innerRy} 0 0 1 ${innerRight} ${topY}
    L ${innerRight} ${botY}
    A ${innerRx} ${innerRy} 0 0 1 ${innerLeft} ${botY}
    Z
  `;

  return (
    <svg width="100%" height="100%" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="tankShell" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={shellA} />
          <stop offset="100%" stopColor={shellB} />
        </linearGradient>
        <linearGradient id="innerTint" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={innerTint} />
          <stop offset="100%" stopColor={innerTint} />
        </linearGradient>
        <linearGradient id="waterFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={waterTop} />
          <stop offset="100%" stopColor={waterBot} />
        </linearGradient>
        <linearGradient id="pipeOuterGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={pipeOuter} />
          <stop offset="100%" stopColor={dark ? '#6b7786' : '#6f7b8d'} />
        </linearGradient>
        <linearGradient id="pipeInnerGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={pipeInner} />
          <stop offset="100%" stopColor={dark ? '#aebdcc' : '#b7c4d2'} />
        </linearGradient>
        <clipPath id="cavity">
          <path d={innerClipPath} />
        </clipPath>
      </defs>

      {/* PUMP with top outlet ring */}
      <g>
        <rect x={pump.x - 2} y={pump.y - 2} width={pump.w + 4} height={pump.h + 4} rx="10" fill="#fff" />
        {pumpImage ? (
          <image href={pumpImage} x={pump.x} y={pump.y} width={pump.w} height={pump.h} preserveAspectRatio="xMidYMid meet" />
        ) : (
          <rect x={pump.x} y={pump.y} width={pump.w} height={pump.h} rx="10" fill="url(#tankShell)" opacity="0.8" />
        )}
        {/* status LED */}
        <circle cx={pump.x + pump.w - 22} cy={pump.y + 16} r="8" fill={motorOn ? '#16a34a' : '#ef4444'} stroke="#fff" strokeWidth="2" />
        {/* upward-facing outlet (small ring) */}
        <ellipse cx={pumpUp.x} cy={pumpUp.y} rx="8" ry="5" fill="#e5e7eb" stroke={rimStroke} />
      </g>

      {/* STAND */}
      <g>
        <rect x={tank.x + 12} y={botY + 2} width={tank.w - 24} height="10" rx="3" fill="#c5ced8" stroke="#9aa6b2" />
        {[tank.x + 32, tank.x + tank.w - 32, tank.x + 52, tank.x + tank.w - 52].map((lx, i) => (
          <g key={i}>
            <rect x={lx - 5} y={botY + 12} width="10" height={standH - 10} rx="3" fill="#b7c2cf" stroke="#8fa1b2" />
            <rect x={lx - 10} y={botY + standH + 2} width="20" height="6" rx="2" fill="#9fb0bf" />
          </g>
        ))}
        <rect x={tank.x + 26} y={botY + standH - 4} width={tank.w - 52} height="8" rx="3" fill="#c5ced8" stroke="#9aa6b2" />
        <path d={`M ${tank.x + 32} ${botY + 12} L ${tank.x + tank.w - 32} ${botY + standH - 2}`} stroke="#9aa6b2" strokeWidth="2" strokeLinecap="round" />
        <path d={`M ${tank.x + tank.w - 32} ${botY + 12} L ${tank.x + 32} ${botY + standH - 2}`} stroke="#9aa6b2" strokeWidth="2" strokeLinecap="round" />
      </g>

      {/* Shadow */}
      <ellipse cx={tank.x + rx} cy={botY + standH + 14} rx={rx * 0.9} ry={9} fill="rgba(0,0,0,0.08)" />

      {/* TANK shell */}
      <rect x={tank.x} y={topY} width={tank.w} height={innerH} fill="url(#tankShell)" />
      <ellipse cx={tank.x + rx} cy={topY} rx={rx} ry={ry} fill="url(#tankShell)" stroke={rimStroke} strokeWidth="1" />
      <ellipse cx={tank.x + rx} cy={botY} rx={rx} ry={ry} fill="url(#tankShell)" stroke={rimStroke} strokeWidth="1" />

      {/* Inside + water */}
      <g clipPath="url(#cavity)">
        <rect x={innerLeft} y={topY - innerRy} width={innerRight - innerLeft} height={innerH + innerRy * 2} fill="url(#innerTint)" opacity="0.28" />
        <rect x={innerLeft} y={waterTopY} width={innerRight - innerLeft} height={waterH} fill="url(#waterFill)" />
        {waterH > 2 && (
          <ellipse cx={tank.x + rx} cy={waterTopY} rx={innerRx - 4} ry={Math.max(6, innerRy - 4)} fill="rgba(255,255,255,0.6)" opacity="0.55" />
        )}
      </g>
      <ellipse cx={tank.x + rx} cy={topY} rx={innerRx} ry={innerRy} fill="none" stroke={rimStroke} strokeWidth="1.5" opacity="0.7" />
      <ellipse cx={tank.x + rx} cy={botY} rx={innerRx} ry={innerRy} fill="none" stroke={rimStroke} strokeWidth="1.5" opacity="0.7" />

      {/* CLEAN central manhole cover */}
      <g>
        <ellipse cx={tank.x + rx} cy={topY - 10} rx="30" ry="10" fill="#bfcad6" stroke={rimStroke} />
        <ellipse cx={tank.x + rx} cy={topY - 18} rx="34" ry="12" fill="#e7edf3" stroke={rimStroke} />
      </g>

      {/* Separate inlet near top-left corner */}
      <g>
        {/* inlet ring on top */}
        <circle cx={inletX} cy={inletY} r="8" fill="#e5e7eb" stroke={rimStroke} />
      </g>

      {/* Overflow (right side, visual) */}
      <g>
        <line x1={innerRight - 6} y1={ofY} x2={ofX + 38} y2={ofY} stroke="url(#pipeOuterGrad)" strokeWidth="10" strokeLinecap="round" />
        <line x1={innerRight - 6} y1={ofY} x2={ofX + 38} y2={ofY} stroke="url(#pipeInnerGrad)" strokeWidth="6" strokeLinecap="round" />
      </g>

      {/* PIPE with 90° corners (miter joins) */}
      <g>
        <path d={pipePath} fill="none" stroke="url(#pipeOuterGrad)" strokeWidth={pipeW} strokeLinecap="butt" strokeLinejoin="miter" />
        <path d={pipePath} fill="none" stroke="url(#pipeInnerGrad)" strokeWidth={pipeW - 6} strokeLinecap="butt" strokeLinejoin="miter" />
        {motorOn && (
          <path d={pipePath} fill="none" stroke={waterTop} strokeWidth={Math.max(6, pipeW - 10)} strokeLinecap="butt" strokeLinejoin="miter" style={{ strokeDasharray: '28 22' }}>
            <animate attributeName="stroke-dashoffset" values="0;-360" dur="1s" repeatCount="indefinite" />
          </path>
        )}
      </g>

      {/* Label moved below the stand */}
      <text
        x={tank.x + rx}
        y={botY + standH + 20}
        textAnchor="middle"
        fontSize="18"
        fill={labelColor}
      >
        Water Tank
      </text>
    </svg>
  );
}
