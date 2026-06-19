import React from 'react';

/**
 * StatusDot — a small filled circle with a soft halo, borrowed from
 * terminal traffic-lights. `live` (green), `warn` (amber), `danger` (red).
 */
export function StatusDot({ status = 'live', size = 9, ...rest }) {
  const colors = {
    live: { c: 'var(--status-live)', halo: 'rgba(40,200,64,.18)' },
    warn: { c: 'var(--status-warn)', halo: 'rgba(251,191,36,.18)' },
    danger: { c: 'var(--status-danger)', halo: 'rgba(255,95,87,.18)' },
  };
  const s = colors[status] || colors.live;
  const style = {
    display: 'inline-block',
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: s.c,
    boxShadow: `0 0 0 3px ${s.halo}`,
    flex: 'none',
  };
  return <span style={style} {...rest} />;
}
