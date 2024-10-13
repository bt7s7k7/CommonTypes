/** Singleton empty array to prevent allocation when returning an empty result. */
export const EMPTY_ARRAY: readonly never[] = []
/** Singleton function returning its argument to prevent allocation for initializing default values. */
export const NOOP = <T>(v: T) => v
