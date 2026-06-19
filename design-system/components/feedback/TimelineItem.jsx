import React, { useState } from 'react';

/**
 * TimelineItem — a single entry on the vertical timeline (education,
 * experience, publications). A cyan node dot on a gradient rail, then a
 * frosted card with an optional logo, title, meta line, and body.
 */
export function TimelineItem({
  logo = null,
  title,
  meta,
  children,
  last = false,
  ...rest
}) {
  const [hover, setHover] = useState(false);
  const wrap = { position: 'relative', paddingLeft: '28px', marginBottom: last ? 0 : '26px' };
  const rail = {
    content: '""',
    position: 'absolute',
    left: '8px',
    top: '6px',
    bottom: last ? 'auto' : '-26px',
    height: last ? '100%' : 'auto',
    width: '2px',
    background: 'linear-gradient(180deg, rgba(125,211,252,.5), rgba(255,255,255,.1))',
  };
  const node = {
    position: 'absolute',
    left: '8px',
    top: '26px',
    transform: 'translate(-50%,-50%)',
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    background: 'var(--accent)',
    boxShadow: '0 0 0 4px rgba(125,211,252,.15)',
    zIndex: 1,
  };
  const card = {
    background: hover ? 'var(--card-hover)' : 'var(--card)',
    border: `1px solid ${hover ? 'var(--border-strong)' : 'var(--border)'}`,
    borderRadius: 'var(--radius-md)',
    padding: '16px 22px',
    transition: 'border-color .25s, background .25s, transform .2s, box-shadow .25s',
    transform: hover ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: hover ? 'var(--shadow-card-hover)' : 'none',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
  };
  const header = { display: 'flex', alignItems: 'center', gap: '14px' };
  const titleStyle = { fontSize: 'var(--text-lead)', fontWeight: 700, lineHeight: 1.3 };
  const metaStyle = { fontSize: 'var(--text-meta)', color: 'var(--muted)', marginTop: '3px' };
  return (
    <div style={wrap} {...rest}>
      <span style={rail} />
      <span style={node} />
      <div
        style={card}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={header}>
          {logo && (
            <img src={logo} alt="" style={{ width: '48px', height: '48px', objectFit: 'contain', flexShrink: 0 }} />
          )}
          <div>
            <div style={titleStyle}>{title}</div>
            {meta && <div style={metaStyle}>{meta}</div>}
          </div>
        </div>
        {children && <div style={{ margin: '8px 0 0' }}>{children}</div>}
      </div>
    </div>
  );
}
