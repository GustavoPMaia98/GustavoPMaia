import * as React from 'react';

export interface PresoBadgeProps {
  /** Presentation kind. `oral` = cyan, `poster` = amber. */
  type?: 'oral' | 'poster';
  /** Override label text (defaults to "Oral" / "Poster"). */
  children?: React.ReactNode;
}

/** Uppercase pill marking a presentation as an oral talk or a poster. */
export function PresoBadge(props: PresoBadgeProps): React.ReactElement;
