import { Constructor } from "./types"

export function makeRandomID() {
    const bytes = new Array<number>(16)

    for (let i = 0; i < 16; i++) {
        bytes[i] = Math.floor(Math.random() * 256)
    }

    const base64 = toBase64Binary(bytes)

    return base64.replace(/\//g, "_").replace(/\+/g, "-").replace(/=/g, "")
}

export function toBase64(source: string): string {
    return (
        // @ts-ignore
        "btoa" in globalThis ? globalThis.btoa(source)
            // @ts-ignore
            : "Buffer" in globalThis ? Buffer.from(source, "binary").toString("base64")
                : toBase64Binary(asciiToBinary(source))
    )
}

export function fromBase64(source: string): string {
    // @ts-ignore
    return "atob" in globalThis ? globalThis.atob(source) : "Buffer" in globalThis ? Buffer.from(source, "base64").toString("binary") : (() => { throw new Error("No function found to parse base64") })()
}

export function ensureProperty<T extends Record<any, unknown>, K extends keyof T>(object: T, key: K, factory: () => T[K]): T[K] {
    if (!(key in object)) object[key] = factory()
    return object[key]
}

export function ensureKey<K, T>(map: Map<K, T>, key: K, factory: () => T) {
    const existing = map.get(key)
    if (existing) return existing
    const created = factory()
    map.set(key, created)
    return created
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

export function stringifyAddress(address: string | { address?: string, port?: string | number } | null) {
    if (address && typeof address == "object") {
        return `[${address.address}]:${address.port}`
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

export function transform<T, R>(value: T, thunk: (v: T) => R) {
    return thunk(value)
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

export function toBase64Binary(source: ArrayBuffer | number[]) {
    const input = source instanceof Array ? source : new Uint8Array(source)
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

export function delayedPromise(timeout: number) {
    return new Promise<void>(resolve => setTimeout(() => resolve(), timeout))
}

export function assertType<T>(value: any): value is T {
    return true
}

export function weightedRandom<T>(source: Iterable<{ value: T, weight: number }>, sum: null | number = null) {
    if (sum == null) {
        sum = 0
        for (const entry of source) {
            sum += entry.weight
        }
    }

    let choice = Math.random() * sum
    for (const entry of source) {
        if (choice < entry.weight) return entry.value
        choice -= entry.weight
    }

    throw new Error("Failed assertion: no choice picked from weighted random")
}

export function* range(length: number) {
    for (let i = 0; i < length; i++) {
        yield i
    }
}

export function modify<T>(target: T, props: Partial<T>) {
    return Object.assign(target, props) as T
}

export function unreachable(reason = "Reached unreachable code"): never {
    throw new Error("Assertion failed: " + reason)
}

export function bindObjectFunction<T>(object: T, transform?: (v: Function, key: string) => Function): T {
    for (const key in object) {
        if (key[0] == key[0].toUpperCase()) continue

        if (typeof object[key] == "function") {
            let func = (object[key] as unknown as Function)
            func = func.bind(object)
            if (transform) func = transform(func, key)
            void ((object as any)[key] = func)
        }
    }

    return object
}

export function wrapFunction<T extends (...args: any) => any>(target: T, wrapper: (target: T) => (...args: Parameters<T>) => ReturnType<T>) {
    return function (this: any, ...args: Parameters<T>) {
        const boundTarget = target.bind(this) as T
        return wrapper(boundTarget)(...args)
    } as T
}

const VLQ_BASE_SHIFT = 5
const VLQ_BASE = 1 << VLQ_BASE_SHIFT
const VLQ_BASE_MASK = VLQ_BASE - 1
const VLQ_CONTINUE = VLQ_BASE
export function vlqDecode(source: Uint8Array | number[] | string) {
    if (typeof source == "string") source = source.split("").map(v => BASE_64_INDEX.indexOf(v))

    const result: number[] = []

    let value = 0
    let shift = 0

    for (const segment of source) {
        const digit = segment & VLQ_BASE_MASK
        value += digit << shift
        shift += VLQ_BASE_SHIFT

        if ((segment & VLQ_CONTINUE) == 0) {
            const negate = (value & 1) == 1
            value >>= 1
            result.push(negate ? -value : value)
            value = 0
            shift = 0
        }
    }

    return result
}

type VLQEncodeType = "base64" | "binary" | "array"
type VLQEncodeResult = {
    "base64": string,
    "binary": Uint8Array,
    "array": number[]
}
export function vlqEncode(value: number | number[]): string
export function vlqEncode<T extends VLQEncodeType>(value: number | number[], encoding: T): VLQEncodeResult[T]
export function vlqEncode(value: number | number[], encoding: VLQEncodeType = "base64"): any {
    let result: number[] = []
    if (value instanceof Array) {
        result = value.flatMap(v => vlqEncode(v, "array"))
    } else {
        if (value < 0) value = ((-value) << 1) | 1
        else value <<= 1

        do {
            let digit = value & VLQ_BASE_MASK
            value >>>= VLQ_BASE_SHIFT
            if (value > 0) digit |= VLQ_CONTINUE
            result.push(digit)
        } while (value > 0)

    }
    if (encoding == "array") return result
    if (encoding == "base64") return result.map(v => BASE_64_INDEX[v]).join("")
    if (encoding == "binary") return new Uint8Array(result)
}

export function reverseIndexOf(string: string, substring: string, maxPos: number) {
    while (!string.startsWith(substring, maxPos) && maxPos > -1) maxPos--
    return maxPos
}

export function* findOccurrences(target: string, substring: string, pos = 0) {
    pos--
    while ((pos = target.indexOf(substring, pos + 1)) != -1) {
        yield pos
    }
}

export function countOccurrences(target: string, substring: string, pos = 0, maxPos: number | null = null) {
    let count = 0
    pos--
    while ((pos = target.indexOf(substring, pos + 1)) != -1) {
        if (maxPos != null && pos >= maxPos) break
        count++
    }

    return count
}

export function findNthOccurrence(target: string, substring: string, number: number, pos = 0) {
    let count = 0
    pos--
    while ((pos = target.indexOf(substring, pos + 1)) != -1) {
        count++
        if (count == number) return pos
    }

    return -1
}

export class Task<T = void> {
    protected state:
        { type: "loading" }
        | { type: "resolved", value: T }
        | { type: "rejected", error: any }
        | { type: "pending", resolve: (value: T) => void, reject: (error: any) => void }
        = { type: "loading" }

    protected promise = new Promise<T>((resolve, reject) => {
        if (this.state.type == "loading") this.state = { type: "pending", reject, resolve }
        else if (this.state.type == "rejected") reject(this.state.error)
        else if (this.state.type == "resolved") resolve(this.state.value)
    })

    public get pending() {
        return this.state.type == "pending" || this.state.type == "loading"
    }

    public get resolved() {
        return this.state.type == "resolved"
    }

    public get rejected() {
        return this.state.type == "rejected"
    }

    public get value() {
        if (this.state.type == "resolved") return this.state.value
        else return null
    }

    public get error() {
        if (this.state.type == "rejected") return this.state.error
        else return null
    }

    public resolve(value: T) {
        if (this.state.type == "pending") this.state.resolve(value)
        else if (this.state.type != "loading") throw new Error("Task already finished")
        this.state = { type: "resolved", value }
    }

    public reject(error: any) {
        if (this.state.type == "pending") this.state.reject(error)
        else if (this.state.type != "loading") throw new Error("Task already finished")
        this.state = { type: "rejected", error }
    }

    public then(...args: Parameters<Promise<T>["then"]>): ReturnType<Promise<T>["then"]> {
        return this.promise.then(...args)
    }

    public catch(...args: Parameters<Promise<T>["catch"]>): ReturnType<Promise<T>["catch"]> {
        return this.promise.catch(...args)
    }

    public finally(...args: Parameters<Promise<T>["finally"]>): ReturnType<Promise<T>["finally"]> {
        return this.promise.finally(...args)
    }
}

export function asciiToBinary(text: string) {
    const result = new Uint8Array(text.length)

    for (let i = 0, len = text.length; i < len; i++) {
        let value = text.charCodeAt(i)
        if (value > 255) value = 63
        result[i] = value
    }

    return result
}

export function uint8ToAscii(source: Uint8Array | number[]) {
    return String.fromCharCode(...source)
}

export function* iterableMap<T, R>(iterable: Iterable<T>, thunk: (v: T, i: number) => R) {
    let i = 0
    for (const value of iterable) {
        yield thunk(value, i++)
    }
}

export function unzip<T>(source: ArrayLike<T>, predicate: (v: T, i: number) => boolean) {
    const pairs: [T, T[]][] = []
    for (let i = 0, len = source.length; i < len; i++) {
        const v = source[i]
        const isHeader = predicate(v, i)
        if (isHeader) {
            pairs.push([v, []])
        } else {
            if (pairs.length > 0) {
                pairs[pairs.length - 1][1].push(v)
            } else {
                throw new Error("Not header first element in unzip")
            }
        }
    }

    return pairs
}

export function voidValue<T>(target: T, value: T) {
    if (target == value) return null
    return target
}

const NUMBER_MIN = "0".charCodeAt(0)
const NUMBER_MAX = "9".charCodeAt(0)
const ALPHA_MIN_1 = "a".charCodeAt(0)
const ALPHA_MAX_1 = "z".charCodeAt(0)
const ALPHA_MIN_2 = "A".charCodeAt(0)
const ALPHA_MAX_2 = "Z".charCodeAt(0)
export function isNumber(char: string) {
    if (!char) return false
    const code = char.charCodeAt(0)
    return code >= NUMBER_MIN && code <= NUMBER_MAX
}

export function isAlpha(char: string) {
    if (!char) return false
    const code = char.charCodeAt(0)
    return (
        (code >= ALPHA_MIN_1 && code <= ALPHA_MAX_1) ||
        (code >= ALPHA_MIN_2 && code <= ALPHA_MAX_2)
    )
}

export function cloneArray<T>(source: T[]) {
    return ([] as T[]).concat(source)
}

export function createShadowObject<T extends Record<string, any>>(target: T) {
    const ret = {} as T

    Object.defineProperties(ret, Object.fromEntries(Object.keys(target).map((key) => [key, { get: () => target[key], set: v => target[key as keyof T] = v }])))

    return ret
}

export function binarySearch<T>(array: T[], comparator: (a: T) => number) {
    let low = 0
    let high = array.length - 1

    while (low <= high) {
        const index = (high + low) >> 1
        const diff = comparator(array[index])
        if (diff > 0) {
            low = index + 1
        } else if (diff < 0) {
            high = index - 1
        } else {
            return index
        }
    }

    return -low - 1
}

export function mutate<T>(target: T, update: Partial<T>) {
    return Object.assign(target, update) as T
}