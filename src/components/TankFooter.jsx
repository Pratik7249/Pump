import React from 'react';

export default function TankFooter() {
  return (
    <footer style={{
      height: 28,
      padding: '0 12px',
      borderTop: '1px solid #e5e7eb',
      background: '#fff',
      fontSize: 11.5,
      color: '#64748b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
      <span>© {new Date().getFullYear()} Water Pump Demo</span>
      <span> College Name </span>
      <span>Status: <b style={{ color:'#0ea5e9' }}>Live</b></span>
    </footer>
  );
}
