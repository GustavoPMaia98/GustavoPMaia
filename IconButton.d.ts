import * as React from 'react';

export interface ButtonProps {
  /** Button label / contents. */
  children?: React.ReactNode;
  /** Visual style. `primary` = cyan→blue gradient; `ghost` = outline; `cta` = italic cosmic-gradient sub-brand pill. */
  variant?: 'primary' | 'ghost' | 'cta';
  /** Size preset. */
  size?: 'sm' | 'md';
  /** Render as an anchor instead of a button. */
  href?: string;
  /** Click handler. */
  onClick?: (e: React.MouseEvent) => void;
  /** Disabled state (dims to 50%, blocks interaction). */
  disabled?: boolean;
  /** Optional leading icon node (e.g. a Lucide SVG). */
  icon?: React.ReactNode;
  /** Native button type when not a link. */
  type?: 'button' | 'submit' | 'reset';
}

/**
 * The brand's primary action button — a cyan→blue gradient pill.
 * @startingPoint section="Core" subtitle="Primary, ghost & CTA buttons" viewport="700x150"
 */
export function Button(props: ButtonProps): React.ReactElement;
