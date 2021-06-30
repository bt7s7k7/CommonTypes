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

export function transform<T>(value: T, thunk: (v: T) => void) {
    thunk(value)
    return value
}

export function voidNaN(value: number) {
    if (isNaN(value)) return null
    else return Number(value)
}

export function makeBound<T extends any[], R>(...args: T) {
    return (f: { (...args: T): R }) => {
        return (f as any).bind(null, ...args) as { (): R }
    }
}

export function autoFilter<T>(source: (T | null | false | undefined | T[])[]) {
    return source.filter(v => v).flatMap(v => v instanceof Array ? v : [v]) as T[]
}

const BASE_64_INDEX = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

export function toBase64Binary(source: ArrayBuffer) {
    const input = new Uint8Array(source)
    const inputLength = input.length
    const segmentsCount = Math.ceil(inputLength / 3)

    const outLength = segmentsCount * 4
    const output = new Array<string>(outLength)

    for (let i = 0; i < segmentsCount; i++) {
        const aO = input[i * 3 + 0]
        const bO = input[i * 3 + 1]
        const cO = input[i * 3 + 2]
        const a = aO ?? 0
        const b = bO ?? 0
        const c = cO ?? 0

        const number = (a << 16) + (b << 8) + c

        output[i * 4 + 0] = BASE_64_INDEX[(number >>> 18) & 63]
        output[i * 4 + 1] = BASE_64_INDEX[(number >>> 12) & 63]
        output[i * 4 + 2] = bO == undefined && cO == undefined ? "=" : BASE_64_INDEX[(number >>> 6) & 63]
        output[i * 4 + 3] = cO == undefined ? "=" : BASE_64_INDEX[(number >>> 0) & 63]
    }

    return output.join("")
}

export function fromBase64Binary(input: string) {
    const inputLength = input.length
    const segmentsCount = Math.ceil(inputLength / 4)

    const paddingIndex = input.indexOf("=")
    const paddingLength = paddingIndex == -1 ? 0 : input.length - paddingIndex

    const outputLength = segmentsCount * 3 - paddingLength
    const output = new Uint8Array(outputLength)

    const processChar = (char: string | undefined) => {
        if (char == undefined) return 0
        if (char == "=") return 0

        const index = BASE_64_INDEX.indexOf(char)
        if (index == -1) throw new Error("Invalid base64 character " + JSON.stringify(char))
        return index
    }

    for (let i = 0; i < segmentsCount; i++) {
        const a = processChar(input[i * 4 + 0])
        const b = processChar(input[i * 4 + 1])
        const c = processChar(input[i * 4 + 2])
        const d = processChar(input[i * 4 + 3])

        const number = (a << 18) + (b << 12) + (c << 6) + d

        output[i * 3 + 0] = (number >>> 16) & 255
        output[i * 3 + 1] = (number >>> 8) & 255
        output[i * 3 + 2] = number & 255
    }

    return output
}

export function makeDataURL(type: string, data: ArrayBuffer | string) {
    data = typeof data == "string" ? data : toBase64Binary(data)

    return `data:${type};base64,${data}`
}

export function runString({ source, env = {}, url }: { source: string, env?: Record<string, any>, url?: string }) {
    if (url) source += "\n//# sourceURL=" + url
    const envEntries = Object.entries(env)
    const compiled = new Function(...envEntries.map(([key]) => key), source)
    return compiled(...envEntries.map(([, value]) => value))
}