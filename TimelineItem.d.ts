import React from 'react';

/**
 * Tag — a small cyan-tinted chip used for research keywords and topics
 * (e.g. "Mechanochemistry", "Astrobiology"). Pill-shaped, translucent.
 */
export function Tag({ children, ...rest }) {
  const style = {
    display: 'inline-block',
    fontFamily: 'var(--font-body)',
    fontSize: 'var(--text-chip)',
    fontWeight: 600,
    lineHeight: 1.4,
    color: 'var(--accent)',
    background: 'rgba(125,211,252,.12)',
    border: '1px solid rgba(125,211,252,.22)',
    padding: '5px 11px',
    borderRadius: 'var(--radius-pill)',
  };
  return (
    <span style={style} {...rest}>
      {children}
    </span>
  );
}
