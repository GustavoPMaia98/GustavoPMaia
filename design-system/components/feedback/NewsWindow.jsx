import React from 'react';

/**
 * NewsWindow — a "terminal window" panel with macOS-style traffic-light
 * dots and a monospace title. Holds a list of dated news items. The
 * signature container for the site's News section.
 */
export function NewsWindow({ title = '~/updates', action = null, children, ...rest }) {
  const win = {
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    overflow: 'hidden',
    background: 'var(--card)',
    boxShadow: 'var(--shadow)',
    fontFamily: 'var(--font-body)',
    color: 'var(--text)',
  };
  const bar = {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    background: 'rgba(255,255,255,.05)',
    borderBottom: '1px solid var(--border)',
  };
  const dots = { display: 'inline-flex', gap: '6px' };
  const dot = (bg) => ({ width: '11px', height: '11px', borderRadius: '50%', background: bg, display: 'block' });
  const titleStyle = { fontFamily: 'var(--font-mono)', fontSize: '.85rem', color: 'var(--muted)' };
  const actionStyle = { marginLeft: 'auto', fontSize: '.82rem', fontWeight: 600 };
  const body = { padding: '6px 16px 14px' };
  return (
    <div style={win} {...rest}>
      <div style={bar}>
        <span style={dots} aria-hidden="true">
          <span style={dot('#ff5f57')} />
          <span style={dot('#febc2e')} />
          <span style={dot('#28c840')} />
        </span>
        <span style={titleStyle}>{title}</span>
        {action && <span style={actionStyle}>{action}</span>}
      </div>
      <div style={body}>{children}</div>
    </div>
  );
}

/**
 * NewsItem — one dated row inside a NewsWindow. The date is a monospace
 * cyan token; the body wraps freely.
 */
export function NewsItem({ date, children, last = false }) {
  const li = {
    padding: '11px 2px',
    borderBottom: last ? 'none' : '1px solid var(--border)',
    fontSize: '.95rem',
    lineHeight: 1.55,
    display: 'flex',
    gap: '10px',
    alignItems: 'baseline',
  };
  const dateStyle = {
    display: 'inline-block',
    minWidth: '76px',
    fontWeight: 700,
    color: 'var(--accent)',
    fontFamily: 'var(--font-mono)',
    fontSize: '.78rem',
    flex: 'none',
  };
  return (
    <div style={li}>
      <span style={dateStyle}>{date}</span>
      <span>{children}</span>
    </div>
  );
}
