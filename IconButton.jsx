import React, { useState } from 'react';

/**
 * Button — the brand's primary action. A cyan→blue gradient pill with
 * near-black text, a ghost outline variant, and the italic "cta" pill
 * used for the tutoring sub-brand. Lifts 2px and glows on hover.
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  href,
  onClick,
  disabled = false,
  icon = null,
  type = 'button',
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);

  const pad = size === 'sm' ? '8px 16px' : '11px 20px';
  const fontSize = size === 'sm' ? '.9rem' : '1rem';

  const base = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: pad,
    fontFamily: 'var(--font-body)',
    fontSize,
    fontWeight: 700,
    lineHeight: 1,
    borderRadius: 'var(--radius-pill)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    textDecoration: 'none',
    border: 'none',
    transition: 'filter .2s, transform .12s, box-shadow .25s',
    transform: press ? 'translateY(0)' : hover && !disabled ? 'translateY(-2px)' : 'translateY(0)',
  };

  const variants = {
    primary: {
      background: 'linear-gradient(90deg, var(--accent), var(--accent-strong))',
      color: 'var(--on-accent)',
      filter: hover && !disabled ? 'brightness(1.06)' : 'none',
      boxShadow: hover && !disabled ? 'var(--shadow-glow-cyan)' : 'none',
    },
    ghost: {
      background: 'transparent',
      color: 'var(--text)',
      border: '1px solid var(--border-strong)',
      boxShadow: hover && !disabled ? '0 8px 22px rgba(255,255,255,.10)' : 'none',
    },
    cta: {
      background: 'var(--grad-cosmic)',
      color: '#fff',
      fontFamily: 'var(--font-display)',
      fontStyle: 'italic',
      boxShadow: hover && !disabled ? '0 8px 22px rgba(27,154,170,.4)' : 'none',
    },
  };

  const style = { ...base, ...(variants[variant] || variants.primary) };

  const handlers = disabled
    ? {}
    : {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => { setHover(false); setPress(false); },
        onMouseDown: () => setPress(true),
        onMouseUp: () => setPress(false),
        onClick,
      };

  const content = (
    <>
      {icon}
      {children}
    </>
  );

  if (href && !disabled) {
    return (
      <a href={href} style={style} {...handlers} {...rest}>
        {content}
      </a>
    );
  }

  return (
    <button type={type} style={style} disabled={disabled} {...handlers} {...rest}>
      {content}
    </button>
  );
}
