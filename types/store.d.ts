/**
 * A deeply reactive view of an object or array. Read a path and the reading
 * computation subscribes to that path; write one and only those readers re-run.
 *
 * Plain objects and arrays are made reactive recursively. Everything else
 * (Date, Map, class instances, DOM nodes) is stored and returned as-is.
 */
export function store<T extends object>(initial: T): T;

/** The underlying object, with no proxy and no tracking. */
export function unwrap<T>(value: T): T;

/** Apply many mutations as one update, so readers run once at the end. */
export function update<T extends object>(target: T, fn: (draft: T) => void): void;

/** Read without subscribing. */
export function peek<T>(fn: () => T): T;

/**
 * Turn an O(n) "which one is selected?" test into an O(1) one.
 *
 * Without it, every row subscribing to `selected` means every row re-runs on
 * every selection change. A selector keeps one small signal per key it is
 * asked about and flips exactly two: the key losing the match and the key
 * gaining it.
 */
export function selector<T>(
  source: () => T,
  equals?: (a: T, b: T) => boolean
): (key: T) => boolean;
