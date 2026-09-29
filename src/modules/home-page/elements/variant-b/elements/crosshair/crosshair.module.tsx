/**
 * The crosshair's parts: two hairlines, a selection box with a handle on
 * each corner, and the coordinate readout. Hidden until the design's motion
 * switches it on for a mouse or trackpad (see crosshair.service.ts), and
 * purely decorative: the real pointer stays in charge.
 */
export function Crosshair() {
  return (
    <div
      aria-hidden
      data-decorative
      data-crosshair
      className="pointer-events-none fixed inset-0 z-(--z-cursor) hidden overflow-hidden"
    >
      <span data-cross-x className="absolute top-0 left-0 block h-px w-full bg-(--bp-cross)" />
      <span data-cross-y className="absolute top-0 left-0 block h-full w-px bg-(--bp-cross)" />
      <span data-cross-box className="border-ink absolute top-0 left-0 block border opacity-0">
        {['-top-1 -left-1', '-top-1 -right-1', '-bottom-1 -left-1', '-right-1 -bottom-1'].map(
          (corner) => (
            <span
              key={corner}
              className={`border-ink bg-surface absolute block size-2 border ${corner}`}
            />
          ),
        )}
      </span>
      <span
        data-cross-readout
        className="bg-ink text-ink-inverse text-caption absolute top-0 left-0 block px-2 py-1 whitespace-pre tabular-nums"
      />
    </div>
  );
}
