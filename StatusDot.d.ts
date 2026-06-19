import * as React from 'react';

export interface MetricStatProps {
  /** The number / value (e.g. "3", "h-index 2"). */
  value?: React.ReactNode;
  /** Uppercase label beneath the number. */
  label?: React.ReactNode;
  /** Optional link (e.g. to Google Scholar). */
  href?: string;
}

/** A single highlight statistic: large cyan Fraunces number + uppercase label. */
export function MetricStat(props: MetricStatProps): React.ReactElement;
