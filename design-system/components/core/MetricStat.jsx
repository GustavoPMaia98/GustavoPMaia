import React from 'react';

/**
 * MetricStat — a single highlight statistic: a large Fraunces number in
 * cyan above a small uppercase label. Used in the hero metrics strip.
 */
export function MetricStat({ value, label, href, ...rest }) {
  const wrap = {
    display: 'flex',
    flexDirection: 'column',
    textDecoration: 'none',
    color: 'inherit',
    fontFamily: 'var(--font-body)',
  };
  const num = {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 'var(--text-metric)',
    color: 'var(--accent)',
    lineHeight: 1,
  };
  const lab = {
    fontSize: 'var(--text-eyebrow)',
    color: 'var(--muted)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--tracking-eyebrow)',
    marginTop: '4px',
  };
  const Inner = (
    <>
      <span style={num}>{value}</span>
      <span style={lab}>{label}</span>
    </>
  );
  if (href) {
    return <a href={href} style={wrap} {...rest}>{Inner}</a>;
  }
  return <div style={wrap} {...rest}>{Inner}</div>;
}
