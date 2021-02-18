import { toString } from "./toString"

export namespace Registry {
    export interface TypeOptions {
        keys: Record<keyof any, any>,
        computed: Record<keyof any, any>,
    }

    export interface Prototype<U, T extends TypeOptions = {
        keys: {},
        computed: {}
    }> extends PrototypeData {
        addKey<K extends keyof U, V = K extends keyof U ? U[K] : any>(key: K): Prototype<U, T & { keys: { [P in K]: V } }>
        addComputedKey<K extends string, V>(key: K, getter: (record: U) => V): Prototype<U, T & { computed: { [P in K]: V } }>
        build(): Type<U, T>
    }

    export interface Type<U, T extends TypeOptions> {
        new(): Instance<U, T>
    }

    export type Instance<U, T extends TypeOptions> = {
        [P in keyof T["keys"]]: Omit<Key<U, T["keys"][P]>, "register" | "unregister">
    } & {
            [P in keyof T["computed"]]: Omit<Key<U, T["keys"][P]>, "register" | "unregister">
        } & {
            register(record: U): Instance<U, T>
            unregister(record: U): Instance<U, T>
            keys: Key[]
        }

    export class Key<T = any, K = any> {

        public register(record: T) {
            const key = this.getter(record)
            if (this.lookupMap.has(key)) throw new Error(`Duplicate key "${this.name}" = "${toString(key)}"`)
            this.lookupMap.set(key, record)
            this.reverseLookupMap.set(record, key)
        }

        public unregister(record: T) {
            const key = this.findReverse(record)
            this.lookupMap.delete(key)
            this.reverseLookupMap.delete(record)
        }

        public tryFind(key: K) {
            return this.lookupMap.get(key) ?? null
        }

        public find(key: K) {
            const ret = this.tryFind(key)
            if (ret === null) throw new Error(`Failed to find key "${toString(key)}"`)
            return ret
        }

        public tryFindReverse(record: T) {
            return this.reverseLookupMap.get(record) ?? null
        }

        public findReverse(record: T) {
            const ret = this.tryFindReverse(record)
            if (ret === null) throw new Error(`Failed to find key for record "${toString(record)}"`)
            return ret
        }

        protected readonly lookupMap = new Map<K, T>()
        protected readonly reverseLookupMap = new Map<T, K>()

        constructor(
            public readonly name: string,
            public readonly index: keyof any,
            protected readonly getter: (record: T) => K
        ) { }
    }

    export interface PrototypeData {
        keys: (keyof any)[],
        computed: { key: string, getter: (record: any) => any }[]
    }

    export function createPrototype(data: PrototypeData = { computed: [], keys: [] }): Prototype<any> {
        return {
            addKey(key) {
                return createPrototype({ ...data, keys: [...data.keys, key] }) as any
            },
            addComputedKey(key, getter) {
                return createPrototype({ ...data, computed: [...data.computed, { key, getter }] }) as any
            },
            build() {
                return function (this: Instance<any, any>) {
                    this.keys = []

                    for (const key of data.keys) {
                        this.keys.push(new Key(key.toString(), key, v => v[key]))
                    }

                    for (const computed of data.computed) {
                        this.keys.push(new Key(computed.key, computed.key, computed.getter))
                    }

                    this.register = (record: any) => {
                        this.keys.forEach(v => v.register(record))
                        return this
                    }

                    this.unregister = (record: any) => {
                        this.keys.forEach(v => v.unregister(record))
                        return this
                    }

                    for (const key of this.keys) {
                        this[key.index as any] = key
                    }

                } as any
            },
            ...data
        }
    }

    export function define<U>(): Prototype<U> {
        return createPrototype()
    }
}