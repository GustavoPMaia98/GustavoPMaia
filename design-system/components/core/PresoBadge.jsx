import React from 'react';

/**
 * PresoBadge — an uppercase pill marking a presentation as an oral talk
 * (cyan) or a poster (amber). Mirrors the All / Oral / Poster filter.
 */
export function PresoBadge({ type = 'oral', children, ...rest }) {
  const palettes = {
    oral: { color: 'var(--accent)', background: 'rgba(125,211,252,.12)', border: 'rgba(125,211,252,.28)' },
    poster: { color: '#fbbf24', background: 'rgba(251,191,36,.12)', border: 'rgba(251,191,36,.30)' },
  };
  const p = palettes[type] || palettes.oral;
  const style = {
    display: 'inline-block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-eyebrow)',
    fontWeight: 800,
    letterSpacing: 'var(--tracking-eyebrow)',
    textTransform: 'uppercase',
    padding: '3px 9px',
    borderRadius: 'var(--radius-pill)',
    color: p.color,
    background: p.background,
    border: `1px solid ${p.border}`,
  };
  return (
    <span style={style} {...rest}>
      {children || (type === 'poster' ? 'Poster' : 'Oral')}
    </span>
  );
}
