import React, { useState } from 'react';

/**
 * IconButton — a square, bordered ghost button for nav tools and icon-only
 * actions (search, theme toggle, language). Holds a Lucide SVG or short
 * text label (e.g. "PT"). 38×38 by default.
 */
export function IconButton({ children, label, onClick, size = 38, ...rest }) {
  const [hover, setHover] = useState(false);
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: `${size}px`,
    height: `${size}px`,
    border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-sm)',
    background: hover ? 'rgba(255,255,255,.06)' : 'transparent',
    color: 'var(--text)',
    cursor: 'pointer',
    fontFamily: 'var(--font-body)',
    fontWeight: 700,
    fontSize: '.82rem',
    transition: 'background .2s, border-color .2s',
  };
  return (
    <button
      type="button"
      style={style}
      aria-label={label}
      title={label}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      {...rest}
    >
      {children}
    </button>
  );
}
