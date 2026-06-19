import React, { useState } from 'react';

/**
 * Card — the frosted-glass surface that holds all content. Translucent
 * white fill over the starfield, hairline border, soft drop shadow.
 * When `interactive`, it lightens, gains a cyan border, and lifts on hover.
 */
export function Card({ children, interactive = false, padding = 24, style: styleProp = {}, ...rest }) {
  const [hover, setHover] = useState(false);
  const lift = interactive && hover;
  const style = {
    background: lift ? 'var(--card-hover)' : 'var(--card)',
    border: `1px solid ${lift ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-lg)',
    boxShadow: lift ? 'var(--shadow-card-hover)' : 'var(--shadow)',
    padding: `${padding}px`,
    color: 'var(--text)',
    fontFamily: 'var(--font-body)',
    transform: lift ? 'translateY(-2px)' : 'translateY(0)',
    transition: 'background .25s, border-color .25s, transform .2s, box-shadow .25s',
    cursor: interactive ? 'pointer' : 'default',
    ...styleProp,
  };
  const handlers = interactive
    ? { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) }
    : {};
  return (
    <div style={style} {...handlers} {...rest}>
      {children}
    </div>
  );
}
