/**
 * Design ბ "Blueprint": the drawing's fixed parts and its pace.
 */

/** Where a room sits on the plan's 12 × 2 grid: first column, columns spanned, first row, rows spanned. */
type Room = readonly [col: number, span: number, row: number, rows: number];

/**
 * The floor plan for one to six services, largest room first. Every layout
 * fills the 12 × 2 grid exactly, so a plan never has an empty room; seven or
 * more services are shared across floors (see `toFloors`).
 */
export const PLANS: Record<number, readonly Room[]> = {
  1: [[1, 12, 1, 2]],
  2: [
    [1, 7, 1, 2],
    [8, 5, 1, 2],
  ],
  3: [
    [1, 6, 1, 2],
    [7, 6, 1, 1],
    [7, 6, 2, 1],
  ],
  4: [
    [1, 7, 1, 1],
    [8, 5, 1, 1],
    [1, 5, 2, 1],
    [6, 7, 2, 1],
  ],
  5: [
    [1, 5, 1, 2],
    [6, 4, 1, 1],
    [10, 3, 1, 1],
    [6, 3, 2, 1],
    [9, 4, 2, 1],
  ],
  6: [
    [1, 5, 1, 1],
    [6, 4, 1, 1],
    [10, 3, 1, 1],
    [1, 3, 2, 1],
    [4, 4, 2, 1],
    [8, 5, 2, 1],
  ],
};

/** Six rooms to a floor at most, shared evenly: seven becomes four and three. */
export function toFloors<T>(items: readonly T[]): T[][] {
  const count = Math.ceil(items.length / 6);
  const floors: T[][] = [];
  let start = 0;
  for (let index = 0; index < count; index += 1) {
    const size = Math.ceil((items.length - start) / (count - index));
    floors.push(items.slice(start, start + size));
    start += size;
  }
  return floors;
}

/** Which end of each room's top wall its door opens at, alternating round the plan. */
export const DOOR_CORNERS = ['tl', 'tr'] as const;

/** Zone markers along a sheet's border, as on any drawing sheet. */
export const ZONES_X = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
export const ZONES_Y = ['1', '2', '3', '4'] as const;

/** The pace of the drawing. Seconds, as GSAP takes them. */
export const BLUEPRINT_MOTION = {
  scrollLerp: 0.1,
  /** Graph paper appearing under the pen. */
  grid: { duration: 0.9, ease: 'power1.out' },
  /** Construction lines shooting across the first sheet. */
  construction: { duration: 1.1, ease: 'expo.inOut' },
  /** A sheet border traced clockwise, side after side. */
  frame: { side: 0.45, ease: 'power2.inOut' },
  /** The headline plotted line by line, left to right. */
  plot: { duration: 0.95, ease: 'power2.inOut', lineStep: 0.22 },
  /** Zone letters settling out of a scramble. */
  scramble: { duration: 0.7, chars: 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789' },
  /** The approval stamp pressed onto the sheet. */
  stamp: { duration: 0.55, ease: 'back.out(2.2)' },
  /** How closely the crosshair follows the pointer. */
  cross: { duration: 0.22, ease: 'power3.out' },
} as const;
