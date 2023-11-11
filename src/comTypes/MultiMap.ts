import { ensureKey, makeRandomID } from "./util"

const DEFAULT_MAP = new Map()

/** Stores entities indexed by multiple separate keys. */
export class MultiMap<I, T extends Record<string, MultiMap.InternalTypes.KeySpecifier<any, boolean, boolean>>> {
    protected sharedKeys = new Map<string, Map<any, Set<I>>>()
    protected reverseKeys = new Map<I, Map<string, any>>()
    protected uniqueKeys = new Map<string, Map<any, I>>()

    public get size() { return this.reverseKeys.size }

    public tryGet<K extends keyof T>(from: K, key: T[K]["type"]): (T[K]["shared"] extends false ? I : ReadonlySet<I>) | null {
        const keyType = this.keyTypes[from]
        if (keyType == null) throw new RangeError(`Invalid key type ${JSON.stringify(keyType)}`)
        const source = keyType.shared ? this.sharedKeys.get(from as string)!
            : this.uniqueKeys.get(from as string)!

        return (source.get(key)! ?? (keyType.shared ? DEFAULT_MAP : null)) as any
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
        return this.reverseKeys.keys()
    }

    public clear() {
        this.reverseKeys.clear()
        for (const index of this.sharedKeys.values()) index.clear()
        for (const index of this.uniqueKeys.values()) index.clear()
    }

    constructor(
        entity: MultiMap.InternalTypes.EntitySpecifier<I>,
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

    /**
     * Used to create a reusable database type.
     * 
     * @example
     * class ArticleDatabase extends MultiMap.type(MultiMap.entity<Article>(), { ... }) { }
     * */
    public static type<I, T extends Record<string, MultiMap.InternalTypes.KeySpecifier<any, boolean, boolean>>>(entity: MultiMap.InternalTypes.EntitySpecifier<I>, keyTypes: T) {
        return function () {
            return new MultiMap(entity, keyTypes)
        } as unknown as new () => MultiMap<I, T>
    }
}

export namespace MultiMap {
    /** Key that of one value, that is unique among entities. If the generator argument is not specified, the key is derived by indexing the entity with the key name. */
    export function key<T>(generator: MultiMap.InternalTypes.KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: false,
            multiple: false,
            generator
        } as MultiMap.InternalTypes.KeySpecifier<T, false, false>
    }

    /** Key that of one value, that can belong to multiple entities. If the generator argument is not specified, the key is derived by indexing the entity with the key name. */
    export function sharedKey<T>(generator: MultiMap.InternalTypes.KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: true,
            multiple: false,
            generator
        } as MultiMap.InternalTypes.KeySpecifier<T, true, false>
    }

    /** Key that consists of multiple values and is unique among entities. If the generator argument is not specified, the key is derived by indexing the entity with the key name. */
    export function multipleKey<T>(generator: MultiMap.InternalTypes.KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: false,
            multiple: true,
            generator
        } as MultiMap.InternalTypes.KeySpecifier<T, false, true>
    }

    /** Key that consists of multiple values and can belong to multiple entities. If the generator argument is not specified, the key is derived by indexing the entity with the key name. */
    export function sharedMultipleKey<T>(generator: MultiMap.InternalTypes.KeySpecifier<any, any, any>["generator"] = null) {
        return {
            shared: true,
            multiple: true,
            generator
        } as MultiMap.InternalTypes.KeySpecifier<T, true, true>
    }

    /** Unique key that is derived using the `makeRandomID()` function */
    export function autoKey<T>() {
        return key<T>(() => makeRandomID())
    }

    /** Specifies the entity type. A separate function is needed because of TypeScript limitations. */
    export function entity<T>() {
        return null! as MultiMap.InternalTypes.EntitySpecifier<T>
    }

    export namespace InternalTypes {
        export interface KeySpecifier<T, S extends boolean, C extends boolean> {
            type: T
            shared: S
            multiple: C
            generator: ((value: any) => any) | null
        }

        export interface EntitySpecifier<T> {
            entity: T
        }
    }
}
