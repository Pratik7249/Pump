import React from 'react';

export default function TankHeader({ onToggle, motorOn }) {
  return (
    <header style={{
      height: 52,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      borderBottom: '1px solid #e5e7eb',
      background: '#fff'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          border: '2px solid #93c5fd', background: '#dbeafe'
        }} />
        <div style={{ fontWeight: 800 }}>Tank Dashboard</div>
      </div>

      <button
        onClick={onToggle}
        style={{
          padding: '10px 14px',
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          background: motorOn ? 'linear-gradient(90deg,#10b981,#34d399)' : 'linear-gradient(90deg,#ef4444,#f97316)',
          color: '#fff',
          border: 'none',
          boxShadow: '0 6px 14px rgba(0,0,0,0.08)'
        }}
        title="Toggle Motor (M)"
      >
        {motorOn ? 'Turn OFF (M)' : 'Turn ON (M)'}
      </button>
    </header>
  );
}
