export function ensureProperty<T extends Record<any, unknown>, K extends keyof T>(object: T, key: K, factory: () => T[K]): T[K] {
    if (!(key in object)) object[key] = factory()
    return object[key]
}