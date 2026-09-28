/** The sessionStorage key that records an intro as played in this tab. */
export function introStorageKey(id: string): string {
  return `stager:intro:${id}`;
}
