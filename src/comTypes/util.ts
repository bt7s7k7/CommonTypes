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
                : toBase64Binary(encodeAscii(source))
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

// `[K] extends [object]` is used to avoid type distribution in conditional,
// without it, for example, `ensureKey<string | null, ...>`  would require
// `Map<string, ...> | Map<null, ...>` instead of `Map<string | null, ...>`.
export function ensureKey<K, T>(map: [K] extends [object] ? Map<K, T> | WeakMap<K, T> : Map<K, T>, key: K, factory: () => T) {
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
    const input = source instanceof Array ? source : new Uint8Array(ensureArrayBuffer(source))
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

/** Typesafe Object.assign */
export function modify<T extends object>(target: T, props: Partial<T>) {
    return Object.assign(target, props) as T
}

/** Typesafe Object.assign which can also add new properties */
export function extend<T extends object, E extends object>(target: T, extend: E & ThisType<T & E>): T & E {
    return Object.assign(target, extend)
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

    public asPromise() {
        return this.promise
    }
}

export function encodeAscii(text: string) {
    const result = new Uint8Array(text.length)

    for (let i = 0, len = text.length; i < len; i++) {
        let value = text.charCodeAt(i)
        result[i] = value
    }

    return result
}
export { encodeAscii as asciiToBinary }
export { decodeAscii as uint8ToAscii }

export function encodeUTF16(text: string) {
    const result = new Uint16Array(text.length)

    for (let i = 0, len = text.length; i < len; i++) {
        let value = text.charCodeAt(i)
        result[i] = value
    }

    return result
}

export function decodeAscii(source: ArrayBuffer | Uint8Array | number[]) {
    const array = source instanceof Array ? source : new Uint8Array(ensureArrayBuffer(source))

    return String.fromCharCode(...array)
}

export function decodeUTF16(source: ArrayBuffer | Uint16Array | number[]) {
    const array = source instanceof Array ? source : new Uint16Array(ensureArrayBuffer(source))

    return String.fromCharCode(...array)
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

export function isLowerCase(char: string) {
    if (!char) return false
    const code = char.charCodeAt(0)
    return (
        (code >= ALPHA_MIN_1 && code <= ALPHA_MAX_1)
    )
}

export function isUpperCase(char: string) {
    if (!char) return false
    const code = char.charCodeAt(0)
    return (
        (code >= ALPHA_MIN_2 && code <= ALPHA_MAX_2)
    )
}

export function isWord(char: string) {
    return isAlpha(char) || isNumber(char) || char == "_"
}

export function cloneArray<T>(source: T[]) {
    return ([] as T[]).concat(source)
}

export function quickFilter<T>(source: T[], predicate: (v: T) => boolean) {
    let last = source.length - 1

    for (let i = 0; i < last;) {
        if (predicate(source[i])) {
            i++
        } else {
            source[i] = source[last]
            last--
        }
    }

    source.length = last + 1
    return source
}

export function createShadowObject<T extends Record<string, any>>(target: T) {
    const ret = {} as T

    Object.defineProperties(ret, Object.fromEntries(Object.keys(target).map((key) => [key, { get: () => target[key], set: v => target[key as keyof T] = v }])))

    return ret
}

/** 
 * Returns the index of the found element based on
 * the comparator function. If the element is not found,
 * returns the index the element would have been, just negative.
 * 
 * To get the positive index use `-index - 1`
 **/
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

export function insertSorted<T>(target: T, array: T[], comparator: (a: T, target: T) => number) {
    const index = binarySearch(array, a => comparator(target, a))
    if (index >= 0) {
        array.splice(index + 1, 0, target)
    } else {
        array.splice(-index - 1, 0, target)
    }
}

export function mutate<T extends object>(target: T, update: Partial<T>) {
    return Object.assign(target, update) as T
}

export function fuzzySearch<T>(input: string, options: T[], getter: (v: T) => string) {
    const filteredOptions: { option: T, cost: number }[] = []

    input = input.toLowerCase()

    for (let option of options) {
        const optionText = getter(option).toLowerCase()
        let cost = 0
        let inputIndex = 0

        for (let i = 0; i < optionText.length; i++) {
            if (inputIndex == input.length) break

            if (optionText[i] == input[inputIndex]) {
                inputIndex++
            } else {
                cost++
            }
        }

        if (inputIndex == input.length) {
            insertSorted({ option, cost }, filteredOptions, (a, b) => a.cost - b.cost)
        }
    }

    return filteredOptions
}

export function camelToSnakeCase(camel: string) {
    return camel.replace(/^./, v => v.toLowerCase()).replace(/[A-Z]/g, v => "_" + v.toLowerCase())
}

export function snakeToCamelCase(snake: string) {
    return snake.replace(/_([a-z])/, (_, v) => v.toUpperCase())
}

export function snakeToPythonCase(snake: string) {
    return snakeToCamelCase(snake).replace(/^./, v => v.toUpperCase())
}

export function camelToTitleCase(camel: string) {
    return camel.replace(/^./, v => v.toLowerCase()).replace(/[A-Z]/g, v => " " + v).replace(/^./, v => v.toUpperCase())
}

type CaseType = "camel" | "snake" | "kebab" | "pascal" | "title"
export function convertCase<K extends CaseType | "array">(input: string, inputType: CaseType, outputType: K): K extends "array" ? string[] : string {
    const parser = makeGenericParser(input)
    const tokens = parser.readAll(
        inputType == "camel" || inputType == "pascal" ? (input, index) => isUpperCase(input[index])
            : inputType == "snake" ? (input, index) => input[index] == "_"
                : inputType == "kebab" ? (input, index) => input[index] == "-"
                    : inputType == "title" ? (input, index) => input[index] == " "
                        : unreachable()
    )


    const words: string[] = []
    for (let i = 0; i < tokens.length; i++) {
        if (i % 2 == 1) continue

        let word = tokens[i]
        if (i != 0 && inputType == "camel" || inputType == "pascal" || inputType == "title") {
            const prefix = tokens[i - 1]
            word = prefix.toLowerCase() + word
        }

        words.push(word)
    }

    if (inputType == "title") words.shift()

    if (outputType == "array") return words as any
    if (outputType == "kebab") return words.join("-") as any
    if (outputType == "snake") return words.join("_") as any

    for (let i = 0; i < words.length; i++) {
        if (outputType == "camel" && i == 0) continue
        words[i] = words[i][0].toUpperCase() + words[i].slice(1)
    }

    if (outputType == "camel" || outputType == "pascal") return words.join("") as any
    if (outputType == "title") return words.join(" ") as any

    unreachable()
}

export function* joinIterable<T>(...iterators: Iterable<T>[]) {
    for (const iterator of iterators) {
        yield* iterator
    }
}

export function transformTree<T>(source: T, replacer: (owner: any, prop: keyof any, value: any) => any) {
    function visit(owner: any, prop: keyof any, value: any) {
        const result = replacer(owner, prop, value)

        if (result != null && typeof result == "object") {
            if (result instanceof Array) {
                const transformed = new Array(result.length)
                for (let i = 0; i < result.length; i++) {
                    transformed[i] = visit(result, i, result[i])
                }

                return transformed
            } else {
                const transformed: any = {}
                for (const [key, value] of Object.entries(result)) {
                    transformed[key] = visit(transformed, key, value)
                }

                return transformed
            }
        }

        return result
    }

    return visit(null, "", source) as T
}

export function escapeHTML(source: string) {
    return source
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

export function iteratorNth<T>(iterator: Iterator<T> | Iterable<T>, index = 0) {
    if (!("next" in iterator)) {
        iterator = iterator[Symbol.iterator]()
    }

    for (let i = 0; ; i++) {
        const result = iterator.next()
        if (result.done) throw new RangeError("Iterator ended before nth result was reached")

        if (i == index) return result.value as T
    }
}

interface GenericParser {
    input: string
    index: number
    getCurrent(): string
    skipUntil(predicate: (input: string, index: number) => boolean): boolean
    readUntil(predicate: (input: string, index: number) => boolean): string
    readAll(delim: (input: string, index: number) => boolean): string[]
    isDone(): boolean
    clone(input?: string): this
    restart(input: string): this
}
const genericParserPrototype: Omit<GenericParser, "index" | "input"> & ThisType<GenericParser> = {
    skipUntil(predicate) {
        while (this.index < this.input.length) {
            if (predicate(this.input, this.index)) {
                return true
            }
            this.index++
        }

        return false
    },
    readUntil(predicate) {
        let start = this.index
        this.skipUntil(predicate)
        let end = this.index

        return this.input.slice(start, end)
    },
    readAll(delim) {
        const tokens: string[] = []
        while (!this.isDone()) {
            tokens.push(this.readUntil(delim))
            if (!this.isDone()) {
                tokens.push(this.input[this.index])
                this.index++
            }
        }
        return tokens
    },
    clone(input) {
        const clone = Object.assign(Object.create(genericParserPrototype), this)
        if (input != undefined) {
            clone.input = input
            clone.index = 0
        }

        return clone
    },
    restart(input) {
        this.input = input
        this.index = 0
        return this
    },
    isDone() {
        return this.index >= this.input.length
    },
    getCurrent() { return this.input[this.index] }
}
export function makeGenericParser<T = {}>(input: string = "", extend?: T & ThisType<T & GenericParser>) {
    return Object.assign(
        Object.create(genericParserPrototype),
        { input, index: 0 },
        extend
    ) as T & GenericParser
}


export function makeObjectByKeyProperty<T, K extends keyof any = string>(list: Iterable<T>, property: keyof T) {
    const result: Record<K, T> = Object.create(null)

    for (const entry of list) {
        result[entry[property] as unknown as K] = entry
    }

    return result
}

export function makeMapByKeyProperty<T, K extends keyof T>(list: Iterable<T>, property: K) {
    const result = new Map<T[K], T>()

    for (const entry of list) {
        result.set(entry[property], entry)
    }

    return result
}

/** 
 * All typed arrays are assignable to `ArrayBuffer`, hovewer
 * if you use the `new TypedArray(ArrayBuffer)` ctor with a typed array,
 * the ctor will copy the array number by number instead of just creating a view.
 * This function ensures a value is actually an `ArrayBuffer`.
 **/
export function ensureArrayBuffer(input: ArrayBuffer | ArrayBufferView) {
    if (ArrayBuffer.isView(input)) return input.buffer

    return input
}

export function repeatString(string: string, count: number) {
    let ret = ""
    for (let i = 0; i < count; i++) {
        ret += string
    }
    return ret
}

/** Creates an object with null prototype with the provided properties */
export function makeLookupObject<T>(props: T) {
    return Object.assign(Object.create(null), props) as T
}

export function rangeOverflow(value: number, min: number, max: number) {
    const size = max - min
    value = value - min

    if (value < 0) {
        value = size + (value % size)
    }

    return value % size
}

export function rangeClamp(value: number, min: number, max: number) {
    if (value > max) value = max
    if (value < min) value = min

    return value
}