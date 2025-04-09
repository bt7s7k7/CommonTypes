// This implementation is based on:
// - https://web.archive.org/web/20120303015224/http://baagoe.org/en/wiki/Mash
// - https://web.archive.org/web/20120303015325/http://baagoe.org/en/wiki/Alea
// The original code has been modified to fit modern JavaScript conventions

const MUL_2_POW_32 = 0x100000000
const DIV_2_POW_32 = 2.3283064365386963e-10

/** Non-cryptographic hashing class, can combine multiple values into a single code. Creates 32-bit codes. */
export class HashCode {
    protected _state = 4022871197

    /** Adds an 32-integer to the hash code. If you want to add a larger number use `addFloat`. */
    public addInt(value: number) {
        let n = this._state + (value | 0)
        let h = 0.02519603282416938 * n

        n = h >>> 0
        h -= n
        h *= n

        n = h >>> 0
        h -= n
        n += h * MUL_2_POW_32

        this._state = n

        return this
    }

    /** Adds a float value to the hash code. If you only have a number that would fit into a 32-bit integer use `addInt()`, since it's faster. */
    public addFloat(value: number) {
        const input = new Float64Array(1)
        const output = new Uint32Array(input.buffer)
        input[0] = value
        this.addInt(output[0])
        this.addInt(output[1])

        return this
    }

    /** Adds a string to the hash code, implemented by running `addNumber` for each character code. */
    public addString(value: string) {
        for (let i = 0; i < value.length; i++) {
            this.addInt(value.charCodeAt(i))
        }

        return this
    }

    /** Returns the result hash code as 32-bit integer */
    public getCode() {
        return this._state
    }

    /** Returns the result hash code as a float in range `0 ≥ x > 1` */
    public getFloat() {
        return (this._state >>> 0) * DIV_2_POW_32
    }
}

/** Base class for all random generators */
export abstract class _Random {
    /** Random float in range `0 ≥ x > 1` */
    public abstract next(): number

    /** Random 32-bit integer */
    public nextInt() {
        return this.next() * MUL_2_POW_32
    }

    /** Returns random float in range `min ≤ x < max` */
    public nextRange(min: number, max: number) {
        return this.next() * (max - min) + min
    }

    /** Returns a random boolean. */
    public nextBoolean() {
        return this.next() > 0.5
    }

    /** Returns random element from the array. */
    public nextElement<T>(array: ArrayLike<T>) {
        return array[this.nextRange(0, array.length) | 0]
    }

    /** Returns a closure, executing the `next` method. This is useful when a function expects a random generator argument. */
    public getFactory() {
        return () => this.next()
    }
}

/** Generates pseudo-random values using the Alea algorithm. If seed is not specified defaults to `Date.now()`. */
export class AleaRandom {
    public s0: number
    public s1: number
    public s2: number
    public c: number

    /** Random float in range `0 ≥ x > 1` */
    public next() {
        let t = 2091639 * this.s0 + this.c * DIV_2_POW_32
        this.s0 = this.s1
        this.s1 = this.s2
        this.c = t | 0
        this.s2 = t - this.c

        return this.s2
    }

    /** Random 32-bit integer */
    public nextInt() {
        return this.next() * MUL_2_POW_32
    }

    /** Returns random float in range `min ≤ x < max` */
    public nextRange(min: number, max: number) {
        return this.next() * (max - min) + min
    }

    /** Returns a random boolean. */
    public nextBoolean() {
        return this.next() > 0.5
    }

    /** Returns random element from the array. */
    public nextElement<T>(array: ArrayLike<T>) {
        return array[this.nextRange(0, array.length) | 0]
    }

    /** Returns a closure, executing the `next` method. This is useful when a function expects a random generator argument. */
    public getFactory() {
        return () => this.next()
    }

    constructor(seed: number | HashCode = Date.now()) {
        const hash = new HashCode()
        if (typeof seed == "object") seed = seed.getCode()

        hash.addFloat(seed)
        this.s0 = hash.getFloat()
        hash.addInt(hash.getCode())
        this.s1 = hash.getFloat()
        hash.addInt(hash.getCode())
        this.s2 = hash.getFloat()

        this.c = 1
    }
}

/** Generates pseudo-random numbers using the native `Math.random()` function. */
export class MathRandom extends _Random {
    public next() {
        return Math.random() * MUL_2_POW_32
    }
}

/** Generates pseudo-random numbers based on LCG algorithm, more specifically its behaviour is equivalent to the glibc implementation. */
export class LcgRandom extends _Random {
    /** Random float in range `0 ≥ x > 1` */
    public next() {
        return this.nextInt() * DIV_2_POW_32
    }

    /** Random 32-bit integer */
    public nextInt() {
        return this.state = (Math.imul(this.state, 1103515245) + 12345) & 0x7fffffff
    }

    constructor(
        public state: number
    ) { super() }
}

/** Generates pseudo-random values. If seed is not specified defaults to `Date.now()`. */
export class Random {
    constructor(seed: number | HashCode = Date.now()) {
        return new AleaRandom(seed)
    }

    public static [Symbol.hasInstance](instance: unknown) {
        return instance instanceof _Random
    }
}
export interface Random extends _Random { }
