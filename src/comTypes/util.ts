import { GenericParser } from "./GenericParser"
import { AbstractConstructor, Constructor } from "./types"

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

/** If the property is not contained on the object, it is created using the factory. Property is then returned. */
export function ensureProperty<T extends Record<any, unknown>, K extends keyof T>(object: T, key: K, factory: () => T[K]): T[K] {
    if (!(key in object)) object[key] = factory()
    return object[key]
}

// `[K] extends [object]` is used to avoid type distribution in conditional,
// without it, for example, `ensureKey<string | null, ...>`  would require
// `Map<string, ...> | Map<null, ...>` instead of `Map<string | null, ...>`.
/** If the key is not present in the map, it is created using the factory. Value is then returned. */
export function ensureKey<K, T>(map: [K] extends [object] ? Map<K, T> | WeakMap<K, T> : Map<K, T>, key: K, factory: () => T) {
    const existing = map.get(key)
    if (existing) return existing
    const created = factory()
    map.set(key, created)
    return created
}

/** Replaces the property on an object with a setter, which is invoked when changed. */
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

/** A `Map` indexed by the class of its values. */
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

/** Ensures the value is an instance of an `Error`. */
export function asError(value: any): Error {
    if (!(value instanceof Error)) value = new Error(toString(value))
    return value
}

/** Returns a string representation of an object. Uses `toString` if not `null`. */
export function toString(value: any): string {
    if (typeof value == "object" && value == null) {
        return "null"
    } else if (typeof value == "undefined") {
        return "undefined"
    } else {
        return value.toString()
    }
}

/** Creates a string representation of a Node.js socket address. */
export function stringifyAddress(address: string | { address?: string, port?: string | number } | null) {
    if (address && typeof address == "object") {
        return `[${address.address}]:${address.port}`
    } else {
        return toString(address)
    }
}

/** Returns a function which executes the thunk with its argument and return the argument unchanged. */
export function sideEffect<T>(thunk: (v: T) => void): (v: T) => T {
    return v => {
        thunk(v)
        return v
    }
}

/** Applies the provided function to the value. */
export function transform<T, R>(value: T, thunk: (v: T) => R) {
    return thunk(value)
}

/** Returns `null` if the value is `NaN`. */
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

/** Executes the provided source using the function constructor. Optionally provide an environment object or a source url for debugging. */
export function runString({ source, env = {}, url }: { source: string, env?: Record<string, any>, url?: string }) {
    if (url) source += "\n//# sourceURL=" + url
    const envEntries = Object.entries(env)
    const compiled = new Function(...envEntries.map(([key]) => key), source)
    return compiled(...envEntries.map(([, value]) => value))
}

export function delayedPromise(timeout: number) {
    return new Promise<void>(resolve => setTimeout(() => resolve(), timeout))
}

/**
 * Forces TypeScript to view the value as the provided type in the scope guarded by this function.
 * 
 * @example
 * const x: number
 * if (assertType<string>(x)) {
 *     console.log(x.length) // x is treated a string here
 * }
 */
export function assertType<T>(value: any): value is T {
    return true
}

export function weightedRandom<T>(source: Iterable<{ value: T, weight: number }>, sum: number | undefined | null = null, value = Math.random()) {
    if (sum == null) {
        sum = 0
        for (const entry of source) {
            sum += entry.weight
        }
    }

    let choice = value * sum
    for (const entry of source) {
        if (choice < entry.weight) return entry.value
        choice -= entry.weight
    }

    throw new Error("Failed assertion: no choice picked from weighted random")
}

/**
 * Returns an iterator, returning numbers `<0, length-1>`.
 */
export function range(length: number): Generator<number, void, unknown>
export function range<T>(length: number, map?: (i: number) => T): Generator<T, void, unknown>
export function* range(length: number, map?: (i: number) => any) {
    for (let i = 0; i < length; i++) {
        if (map) yield map(i)
        else yield i
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

/** Binds all function in an object to always have `this` as the object. Use the `transform` function if you want to replace some functions. */
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

/** @deprecated Use `encodeAscii` */
export const asciiToBinary = encodeAscii
/** @deprecated Use `decodeAscii` */
export const uint8ToAscii = decodeAscii

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

/** Returns a iterator, yielding values from the provided iterable, transformed by the `thunk`. */
export function* iterableMap<T, R>(iterable: Iterable<T>, thunk: (v: T, i: number) => R) {
    let i = 0
    for (const value of iterable) {
        yield thunk(value, i++)
    }
}

/** Iterates the iterator until predicate succeeds, returns the index. */
export function iterableFind<T>(iterable: Iterable<T>, predicate: (v: T, i: number) => boolean) {
    let i = 0

    for (const value of iterable) {
        if (predicate(value, i++)) return value
    }

    return null
}

/** Splits an array into smaller chunks by sentinel elements (determined by `predicate`). First element must be a sentinel, otherwise throws. */
export function unzip<T>(source: ArrayLike<T>, predicate: (v: T, i: number) => boolean) {
    const pairs: [sentinel: T, elements: T[]][] = []
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

/** Returns `target` if it is not equal to `value` else `null`. */
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
/** Tests if the provided character is a number (i.e. character from `0` to `9`). */
export function isNumber(char: string, index = 0) {
    if (!char) return false
    const code = char.charCodeAt(index)
    return code >= NUMBER_MIN && code <= NUMBER_MAX
}

/** Tests if the provided character is a letter from `a` to `z`, may be uppercase
 * or lowercase. To test a specific case use `isLowerCase` or `isUpperCase`. */
export function isAlpha(char: string, index = 0) {
    if (!char) return false
    const code = char.charCodeAt(index)
    return (
        (code >= ALPHA_MIN_1 && code <= ALPHA_MAX_1) ||
        (code >= ALPHA_MIN_2 && code <= ALPHA_MAX_2)
    )
}

/** Tests if the provided character is a letter from `a` to `z`,
 * To only test if a character is a letter use `isAlpha`. */
export function isLowerCase(char: string, index = 0) {
    if (!char) return false
    const code = char.charCodeAt(index)
    return (
        (code >= ALPHA_MIN_1 && code <= ALPHA_MAX_1)
    )
}

/** Tests if the provided character is a letter from `A` to `Z`,
 * To only test if a character is a letter use `isAlpha`. */
export function isUpperCase(char: string, index = 0) {
    if (!char) return false
    const code = char.charCodeAt(index)
    return (
        (code >= ALPHA_MIN_2 && code <= ALPHA_MAX_2)
    )
}

/** Tests if the provided character matches the RegExp token `\w`, which means alphanumeric characters and `_`. */
export function isWord(char: string, index = 0) {
    if (!char || !char[index]) return false
    return isAlpha(char, index) || isNumber(char, index) || char[index] == "_"
}

export function cloneArray<T>(source: T[]) {
    return ([] as T[]).concat(source)
}

/**
 * Filters array inplace, with a minimal amount of writes. Can change the order of elements.
 */
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

/**
 * Creates an object with setters and getters corresponding to all enumerable properties of the target object.
 */
export function createShadowObject<T extends Record<string, any>>(target: T) {
    const ret = {} as T

    Object.defineProperties(ret, Object.fromEntries(Object.keys(target).map((key) => [key, { get: () => target[key], set: v => target[key as keyof T] = v }])))

    return ret
}

/** 
 * Returns the index of the found element based on\
 * the comparator function. If the element is not found,\
 * returns negative number representing, what the index\
 * would have been. Use `-index - 1` to get this index.
 * 
 * @example
 * binarySearch([1,2,3], a => 3 - a) // returns 2
 * binarySearch([1,2,4], a => 3 - a) // returns -3 (2)
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

/**
 * Inserts an element based on a binary search. To sort ascending compare `(a,b) => a - b`, descending `(a,b) => b - a`.
 */
export function insertSorted<T>(target: T, array: T[], comparator: (a: T, target: T) => number) {
    const index = binarySearch(array, a => comparator(target, a))
    if (index >= 0) {
        array.splice(index + 1, 0, target)
    } else {
        array.splice(-index - 1, 0, target)
    }
}

/** @deprecated Use `modify`. */
export const mutate = modify

/** Returns the input options sorted by similarity to the query. Use the
 * `getter` function to specify the string representation of an option. */
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
/** Converts between programming cases. The input is first split into
 * tokens the joined together based on the `outputType`, to get a raw list
 * of tokens set `array` as the output type. */
export function convertCase<K extends CaseType | "array">(input: string, inputType: CaseType, outputType: K): K extends "array" ? string[] : string {
    const parser = new GenericParser(input)
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

/** 
 * Return a new iterator, which returns values of provided iterators sequentially.
 * @example 
 * const concatenated = new Set(jointIterable(setA, setB))
 * */
export function* joinIterable<T>(...iterators: Iterable<T>[]) {
    for (const iterator of iterators) {
        yield* iterator
    }
}

/** @deprecated This function is only provided for backwards compatibility. */
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

/** Escapes a string to be used in raw HTML by replacing the following characters with HTML entities: `&`, `<`, `>`, `"`, `'`.  */
export function escapeHTML(source: string) {
    return source
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
}

/** Iterates the provided iterator until reaching the n-th value,
 * which is returned. Default index is 0. When the iterator finished
 * before the specified index is found, an `RangeError` is thrown. */
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

/** @deprecated Use the `GenericParser` constructor */
export function makeGenericParser<T = {}>(input: string = "", extend?: T & ThisType<T & GenericParser>) {
    return new GenericParser(input, extend)
}

/** Creates an object from the provided iterable,
 * with the property names being based on the specified property.
 * The returned object has a null prototype. */
export function makeObjectByKeyProperty<T, K extends keyof any = string>(list: Iterable<T>, property: keyof T) {
    const result: Record<K, T> = Object.create(null)

    for (const entry of list) {
        result[entry[property] as unknown as K] = entry
    }

    return result
}

/** Creates a map from the provided iterable, with the keys being based on the specified property. */
export function makeMapByKeyProperty<T, K extends keyof T>(list: Iterable<T>, property: K) {
    const result = new Map<T[K], T>()

    for (const entry of list) {
        result.set(entry[property], entry)
    }

    return result
}

/** 
 * All typed arrays are assignable to `ArrayBuffer`, however
 * if you use the `new TypedArray(ArrayBuffer)` ctor with a typed array,
 * the ctor will copy the array number by number instead of just creating a view.
 * This function ensures a value is actually an `ArrayBuffer`.
 **/
export function ensureArrayBuffer(input: ArrayBuffer | ArrayBufferView) {
    if (ArrayBuffer.isView(input)) return input.buffer

    return input
}

/** @deprecated Use `String.prototype.repeat` */
export function repeatString(string: string, count: number) {
    let ret = ""
    for (let i = 0; i < count; i++) {
        ret += string
    }
    return ret
}

/** Creates an object with null prototype and the provided props. */
export function makeLookupObject<T>(props: T) {
    return Object.assign(Object.create(null), props) as T
}

/**
 * Constraints a value to a range, wrapping around when boundaries are exceeded.
 * Similar to the modulo operator but also works with negative overflow.
 * Min is inclusive but max is exclusive.
 * */
export function rangeOverflow(value: number, min: number, max: number) {
    const size = max - min
    value = value - min

    if (value < 0) {
        value = size + (value % size)
    }

    return value % size
}

/** Clamps a value in a range, min and max are inclusive. */
export function rangeClamp(value: number, min: number, max: number) {
    if (value > max) value = max
    if (value < min) value = min

    return value
}

export function isPrimitiveValue(value: any): value is string | number | boolean | null {
    return typeof value == "string" || typeof value == "number" || typeof value == "boolean" || (typeof value == "object" && value == null)
}

/** Linearly interpolates a number.  */
export function lerpNumber(from: number, to: number, t: number) {
    return from * (1 - t) + to * t
}

/**
 * Creates a shallow clone of the provided object, maintaining it's prototype, and deletes the specified properties.
 */
export function cloneWithout<T>(object: T, ...omit: (keyof T)[]) {
    const clone = Object.assign(Object.create(Object.getPrototypeOf(object)), object)
    for (const key of omit) delete clone[key]
    return clone
}

/**
 * Creates a shallow clone of the provided object, maintaining it's prototype.
 */
export function shallowClone<T>(object: T) {
    return cloneWithout(object) as T
}

/**
 * Runs a constructor in the provided class even if the constructor is marked as protected or private.
 */
export function executeProtectedConstructor<T>(ctor: T, ...args: ConstructorParameters<{ new(): never } & T>): InstanceType<{ new(): never } & T> {
    // @ts-ignore
    return new ctor(...args)
}

/** 
 * Visits a tree in pre-order, the visitor callback is expected to return an array of children.
 * @example
 * visitTree(rootNode, node => (nodes.push(node), node.children))
 * */
export function visitTree<T>(root: T, visitor: (value: T, depth: number) => Iterable<T>, returnCallback?: (value: T, depth: number) => void) {
    const visit = (node: T, depth: number) => {
        const children = visitor(node, depth)
        for (const child of children) {
            visit(child, depth + 1)
        }
        returnCallback?.(node, depth)
    }

    visit(root, 0)
}

/** Finds the index of a sequence of elements in an array. Returns `-1` if none found. */
export function findSequence<T>(array: ArrayLike<T>, sequence: ArrayLike<T>, startPos = 0) {
    let start = -1
    let progress = 0
    for (let i = startPos; i < array.length; i++) {
        if (array[i] == sequence[progress]) {
            if (start == -1) start = i
            progress++
            if (progress == sequence.length) {
                return start
            }
        } else if (start != -1) {
            start = -1
            progress = 0
        }
    }

    return -1
}

/** Pre-made functions for `Array.reduce` */
export namespace Reducers {
    /** Calculates a sum of all elements, use the getter argument to return a numeric value from the element type (not needed number arrays) */
    export function sum<T = number>(getter?: (v: T) => number): (a: number, b: T) => number {
        if (getter == null) return (a, b) => a + (b as any as number)
        return (a, b) => a + getter(b)
    }

    export interface QueryResult<T> { element: T, value: number, index: number }

    /** Returns the smallest element of the array, use the getter argument to return a numeric value from the element type (not needed number arrays) */
    export function smallest<T = number>(getter?: (v: T) => number): (a: QueryResult<T> | null, b: T, index: number) => QueryResult<T> {
        return (a, b, index) => {
            const value = getter == null ? (b as any as number) : getter(b)
            if (a == null) return { value, element: b, index }
            const min = a.value
            if (value < min) return { value, element: b, index }
            else return a ?? unreachable()
        }
    }

    /** Returns the largest element of the array, use the getter argument to return a numeric value from the element type (not needed number arrays) */
    export function largest<T = number>(getter?: (v: T) => number): (a: QueryResult<T> | null, b: T, index: number) => QueryResult<T> {
        return (a, b, index) => {
            const value = getter == null ? (b as any as number) : getter(b)
            if (a == null) return { value, element: b, index }
            const max = a.value
            if (value > max) return { value, element: b, index }
            else return a ?? unreachable()
        }
    }
}

/** Iterates an array in the reverse order */
export function* reverseIterate<T>(array: ArrayLike<T>) {
    for (let i = array.length - 1; i >= 0; i--) {
        yield array[i]
    }
}

/** Removes the specified value from an array */
export function arrayRemove<T>(array: T[], value: T) {
    const index = array.indexOf(value)
    if (index == -1) return false
    array.splice(index, 1)
    return true
}

/** Returns a function which executes all provided functions with the same arguments, returning their return values in an array */
export function multicast<A extends any[], T extends ((...args: A) => any)[]>(...targets: T) {
    // @ts-ignore Older versions of TypeScript to not accept `ReturnType<T[P]>`, because they don't know `T[P]` is a function
    return (...args: A) => targets.map(v => v(...args)) as { [P in keyof T]: ReturnType<T[P]> }
}

export namespace Predicate {
    export function instanceOf<T>(type: AbstractConstructor<T>) {
        return (value: unknown): value is T => value instanceof type
    }

    export function containedIn<T>(collection: { has(value: T): boolean } | { includes(value: T): boolean } | null | undefined) {
        if (collection == null) return (value: T) => false

        if ("has" in collection) {
            return (value: T) => collection.has(value)
        } else {
            return (value: T) => collection.includes(value)
        }
    }

    export function invert<T extends (...args: any[]) => boolean>(predicate: T) {
        return (...args: Parameters<T>) => !predicate(...args)
    }

    export function and<T>(...predicates: ((value: T) => boolean)[]) {
        return (value: T) => {
            for (const predicate of predicates) {
                if (!predicate(value)) return false
            }

            return true
        }
    }

    type PredicateFactory = (...args: any[]) => (...args: any) => boolean
    type PredicateMap = { [P in keyof typeof Predicate]: typeof Predicate[P] extends PredicateFactory ? typeof Predicate[P] : undefined }
    export const not = new Proxy<PredicateMap>({} as any, {
        get(target, prop, receiver) {
            const predicateFactory = Predicate[prop as keyof typeof Predicate] as any as PredicateFactory
            return (...args: any[]) => {
                const predicate = predicateFactory(...args)
                return (...args: any[]) => !predicate(...args)
            }
        },
    })
}

export function searchUntil<T>(generator: () => T, predicate: (value: T) => boolean, { maxAttempts = 1000 as null | number } = {}) {
    let value: T
    let attempt = 0
    do {
        value = generator()
        attempt++

        if (maxAttempts != null && attempt > maxAttempts) {
            throw new RangeError("Search reached maximum attempts")
        }
    } while (!predicate(value))

    return value
}

export function objectMap<T extends Record<keyof any, any>, R>(target: T, getter: (value: T[keyof T], index: keyof T, target: T) => R): Record<keyof T, R>
export function objectMap<T extends Record<keyof any, any>, K extends keyof T[keyof T]>(target: T, prop: K): { [P in keyof T]: T[P][K] }
export function objectMap(value: Record<keyof any, any>, getter: string | ((value: any, index: keyof any, target: any) => any)) {
    if (typeof getter == "string") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, v[getter]]))
    } else {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, getter(v, k, value)]))
    }
}
