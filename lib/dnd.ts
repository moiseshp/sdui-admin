import type { Modifier } from '@dnd-kit/core';

/** Sections only move up and down. */
export const restrictToVerticalAxis: Modifier = ({ transform }) => ({ ...transform, x: 0 });
