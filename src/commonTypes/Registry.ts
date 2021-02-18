import { IDGen } from "./IDGen"
import { toString } from "./toString"

export namespace Registry {
    export interface TypeOptions {
        keys: Record<keyof any, any>,
        computed: Record<keyof any, any>,
        genID: { key: string, type: "increment" | "random" } | null
    }

    export interface Prototype<U, T extends TypeOptions = {
        keys: {},
        computed: {},
        genID: null
    }> extends PrototypeData {
        addKey<K extends keyof U, V = K extends keyof U ? U[K] : any>(key: K): Prototype<U, T & { keys: { [P in K]: V } }>
        addComputedKey<K extends string, V>(key: K, getter: (record: U) => V): Prototype<U, T & { computed: { [P in K]: V } }>
        addIncrementID<K extends string = "id">(key?: K): Prototype<U, Omit<T, "genID"> & { genID: { key: K, type: "increment" } }>
        addRandomID<K extends string = "id">(key?: K): Prototype<U, Omit<T, "genID"> & { genID: { key: K, type: "random" } }>
        build(): Type<U, T>
    }

    export interface Type<U, T extends TypeOptions> {
        new(): Instance<U, T>
    }

    export type Instance<U, T extends TypeOptions> = {
        [P in keyof T["keys"]]: Omit<Key<U, T["keys"][P]>, "register" | "unregister">
    } & {
            [P in keyof T["computed"]]: Omit<Key<U, T["keys"][P]>, "register" | "unregister">
        } & (T["genID"] extends null ? {} : {
            [P in NonNullable<T["genID"]>["key"]]: Omit<GeneratedKey<U>, "register" | "unregister">
        }) & {
            register(record: U, options?: RegisterOptions): Instance<U, T>
            unregister(record: U): Instance<U, T>
            keys: Key[],
            nextID(): string
        }

    export class Key<T = any, K = any> {

        public register(record: T, options: RegisterOptions) {
            const key = this.getter(record, options)
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
            protected readonly getter: (record: T, options: RegisterOptions) => K
        ) { }
    }

    export class GeneratedKey<T = any> extends Key<T, string> {

        public nextID() {
            let id: string
            do {
                if (this.type == "random") {
                    id = IDGen.random()
                } else {
                    id = (this.counter++).toString()
                }
            } while (this.tryFind(id))

            return id
        }

        protected counter = 0

        constructor(
            name: string,
            protected readonly type: NonNullable<TypeOptions["genID"]>["type"]
        ) {
            super(name, name, (_, { genID }) => genID ?? this.nextID())
        }
    }

    export interface PrototypeData {
        keys: (keyof any)[],
        computed: { key: string, getter: (record: any) => any }[],
        genID: TypeOptions["genID"]
    }

    export interface RegisterOptions {
        genID?: string
    }

    export function createPrototype(data: PrototypeData = { computed: [], keys: [], genID: null }): Prototype<any> {
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

                    if (data.genID) {
                        this.keys.push(new GeneratedKey(data.genID.key, data.genID.type))
                    }

                    this.register = (record: any, options = {}) => {
                        this.keys.forEach(v => v.register(record, options))
                        return this
                    }

                    this.unregister = (record: any) => {
                        this.keys.forEach(v => v.unregister(record))
                        return this
                    }

                    let counter = 0
                    this.nextID = () => {
                        return (counter++).toString()
                    }

                    for (const key of this.keys) {
                        this[key.index as any] = key
                    }

                } as any
            },
            addIncrementID(key) {
                return createPrototype({ ...data, genID: { key: key ?? "id", type: "increment" } }) as any
            },
            addRandomID(key) {
                return createPrototype({ ...data, genID: { key: key ?? "id", type: "random" } }) as any
            },
            ...data
        }
    }

    export function define<U>(): Prototype<U> {
        return createPrototype()
    }
}