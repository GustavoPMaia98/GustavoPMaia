import * as React from 'react';

export interface CardProps {
  /** Card contents. */
  children?: React.ReactNode;
  /** When true, the card lightens + gains a cyan border + lifts 2px on hover. */
  interactive?: boolean;
  /** Inner padding in px. Default 24. */
  padding?: number;
  /** Extra inline style overrides. */
  style?: React.CSSProperties;
}

/**
 * Frosted-glass content surface — the base container of the system.
 * @startingPoint section="Core" subtitle="Frosted-glass content card" viewport="700x200"
 */
export function Card(props: CardProps): React.ReactElement;
