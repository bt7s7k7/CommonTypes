/** Singleton empty array to prevent allocation when returning an empty result. */
export const EMPTY_ARRAY: readonly never[] = []
/** Singleton empty set to prevent allocation when returning an empty result. */
export const EMPTY_SET: ReadonlySet<any> = new Set<any>()
/** Singleton empty map to prevent allocation when returning an empty result. */
export const EMPTY_MAP: ReadonlyMap<any, any> = new Map<any, any>()
/** Singleton function returning its argument to prevent allocation for initializing default values. */
export const NOOP = <T>(v: T) => v
export const EMPTY_ITERATOR: IterableIterator<any> = {
    next() { return { value: undefined, done: true } },
    return(value) { return { value, done: true } },
    throw(e) { throw e },
    [Symbol.iterator]() { return this }
}
