import { Constructor } from "./types"

export function makeRandomID() {
    const makeSegment = () => parseInt(Math.random().toString().substr(2)).toString(16)

    const source = (makeSegment() + makeSegment() + makeSegment()).substr(0, 32)

    const bytes: number[] = []
    for (let i = 0; i < source.length / 2; i++) {
        const byte = source.substr(i * 2, 2)
        bytes.push(parseInt(byte, 16))
    }
    const binary = String.fromCharCode(...bytes)
    const base64 = toBase64(binary)

    return base64.replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "")
}

export function toBase64(source: string): string {
    // @ts-ignore
    return "btoa" in globalThis ? globalThis.btoa(source) : "Buffer" in globalThis ? Buffer.from(source, "binary").toString("base64") : (() => { throw new Error("No function found to get base64") })()
}

export function fromBase64(source: string): string {
    // @ts-ignore
    return "atob" in globalThis ? globalThis.atob(source) : "Buffer" in globalThis ? Buffer.from(source, "base64").toString("binary") : (() => { throw new Error("No function found to parse base64") })()
}

export function ensureProperty<T extends Record<any, unknown>, K extends keyof T>(object: T, key: K, factory: () => T[K]): T[K] {
    if (!(key in object)) object[key] = factory()
    return object[key]
}

export function makePropertyObserver<T extends Record<keyof any, any>, K extends keyof T>(target: T, prop: K, callback: (newValue: T[K], oldValue: T[K]) => void) {
    let value = target[prop]

    Object.defineProperty(target, prop, {
        get() {
            return value
        },
        set(v) {
            callback(v, value)
            value = v
        }
    })
}

export class TypedMap {

    public get<T extends Constructor>(key: T): InstanceType<T> | null {
        return this.store.get(key)
    }

    public set<T extends Constructor>(key: T, value: InstanceType<T>) {
        this.store.set(key, value)
    }

    public delete(key: Constructor) {
        return this.store.delete(key)
    }

    public load<T extends Record<string, Constructor>>(query: T) {
        const ret: Record<string, any> = {}

        for (const [key, value] of Object.entries(query)) {
            const found = this.store.get(value)
            if (!found) throw new RangeError(`Failed to find entry ${JSON.stringify(key)}: "${value.name}"`)
            ret[key] = found
        }

        return ret as { [P in keyof T]: InstanceType<T[P]> }
    }

    public [Symbol.iterator] = () => this.store[Symbol.iterator]()

    protected store = new Map<Constructor, any>()
}

export function asError(value: any): Error {
    if (!(value instanceof Error)) value = new Error(toString(value))
    return value
}

export function toString(value: any): string {
    if (typeof value == "object" && value == null) {
        return "null"
    } else if (typeof value == "undefined") {
        return "undefined"
    } else {
        return value.toString()
    }
}

export function stringifyAddress(address: string | { address: string, port: string | number } | null) {
    if (address && typeof address == "object") {
        return `http://[${address.address}]:${address.port}`
    } else {
        return toString(address)
    }
}

export function sideEffect<T>(thunk: (v: T) => void): (v: T) => T {
    return v => {
        thunk(v)
        return v
    }
}

export function voidNaN(value: number) {
    if (isNaN(value)) return null
    else return Number(value)
}
