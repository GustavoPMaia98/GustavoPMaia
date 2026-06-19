import * as React from 'react';

export interface StatusDotProps {
  /** Status colour. */
  status?: 'live' | 'warn' | 'danger';
  /** Diameter in px. Default 9. */
  size?: number;
}

/** Small filled status circle with a soft halo (terminal traffic-light palette). */
export function StatusDot(props: StatusDotProps): React.ReactElement;
