import * as React from 'react';

export interface IconButtonProps {
  /** Icon node or short text label (e.g. a Lucide SVG, or "PT"). */
  children?: React.ReactNode;
  /** Accessible label (also the tooltip). */
  label?: string;
  /** Click handler. */
  onClick?: (e: React.MouseEvent) => void;
  /** Square size in px. Default 38. */
  size?: number;
}

/** Square bordered ghost button for nav tools and icon-only actions. */
export function IconButton(props: IconButtonProps): React.ReactElement;
