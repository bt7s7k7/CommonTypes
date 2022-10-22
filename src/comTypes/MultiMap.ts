import { ensureKey, makeRandomID } from "./util"

interface KeySpecifier<T, S extends boolean, C extends boolean> {
    type: T
    shared: S
    multiple: C
    generator: ((value: any) => string) | null
}

interface EntitySpecifier<T> {
    entity: T
}

export class MultiMap<I, T extends Record<string, KeySpecifier<any, boolean, boolean>>> {
    protected sharedKeys = new Map<string, Map<any, Set<I>>>()
    protected reverseKeys = new Map<I, Map<string, any>>()
    protected uniqueKeys = new Map<string, Map<any, I>>()

    public tryGet<K extends keyof T>(from: K, key: T[K]["type"]): (T[K]["shared"] extends false ? I : ReadonlySet<I>) | null {
        const keyType = this.keyTypes[from]
        if (keyType == null) throw new RangeError(`Invalid key type ${JSON.stringify(keyType)}`)
        const source = keyType.shared ? this.sharedKeys.get(from as string)!
            : this.uniqueKeys.get(from as string)!

        return (source.get(key)! ?? null) as any
    }

    public get<K extends keyof T>(from: K, key: T[K]["type"]): T[K]["shared"] extends false ? I : ReadonlySet<I> {
        const value = this.tryGet(from, key)
        if (value == null) throw new RangeError("Cannot find value with key")

        return value
    }

    public add(value: I) {
        if (this.reverseKeys.has(value)) return false

        const reverseKeys = new Map<string, any>()
        this.reverseKeys.set(value, reverseKeys)

        for (const [name, key] of Object.entries(this.keyTypes)) {
            let keyValues = key.generator?.(value) ?? (value as any)[name]

            reverseKeys.set(name, keyValues)
            if (!key.multiple) {
                keyValues = [keyValues]
            }

            for (const keyValue of keyValues) {
                if (key.shared) {
                    const set = ensureKey(this.sharedKeys.get(name)!, keyValue, () => new Set())
                    set.add(value)
                } else {
                    const keyStore = this.uniqueKeys.get(name)!
                    if (keyStore.has(keyValue)) throw new RangeError("Entity with duplicate key")

                    keyStore.set(keyValue, value)
                }
            }
        }

        return true
    }

    public delete(value: I) {
        const reverseKeys = this.reverseKeys.get(value)!
        if (reverseKeys == null) return false
        this.reverseKeys.delete(value)

        for (let [keyName, keyValues] of reverseKeys) {
            const keyType = this.keyTypes[keyName]

            if (!keyType.multiple) {
                keyValues = [keyValues]
            }

            for (const keyValue of keyValues) {
                if (keyType.shared) {
                    const keyStore = this.sharedKeys.get(keyName)!
                    const set = keyStore.get(keyValue)!
                    set.delete(value)
                    if (set.size == 0) keyStore.delete(keyName)
                } else {
                    this.uniqueKeys.get(keyName)!.delete(keyValue)!
                }
            }
        }

        return true
    }

    public update(value: I) {
        if (!this.delete(value)) throw new RangeError("Entity is not stored in the map")
        this.add(value)
    }

    public has(value: I) {
        return this.reverseKeys.has(value)
    }

    public [Symbol.iterator]() {
        return this.reverseKeys[Symbol.iterator]() as IterableIterator<[I, ReadonlyMap<keyof T, any>]>
    }

    public values() {
        return this.reverseKeys.values()
    }

    constructor(
        entity: EntitySpecifier<I>,
        protected readonly keyTypes: T
    ) {
        for (const [name, key] of Object.entries(keyTypes)) {
            if (key.shared) {
                this.sharedKeys.set(name, new Map())
            } else {
                this.uniqueKeys.set(name, new Map())
            }
        }
    }
}

export namespace MultiMap {
    export function key<T>(generator: KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: false,
            multiple: false,
            generator
        } as KeySpecifier<T, false, false>
    }

    export function sharedKey<T>(generator: KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: true,
            multiple: false,
            generator
        } as KeySpecifier<T, true, false>
    }

    export function multipleKey<T>(generator: KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: false,
            multiple: true,
            generator
        } as KeySpecifier<T, false, true>
    }

    export function autoKey<T>() {
        return key<T>(() => makeRandomID())
    }

    export function entity<T>() {
        return null! as EntitySpecifier<T>
    }
}
