interface GenericParser {
    input: string
    index: number
    getCurrent(): string
    at(offset: number): string
    skipUntil(predicate: (input: string, index: number) => boolean): boolean
    skipUntil(token: string): boolean
    readUntil(predicate: (input: string, index: number) => boolean): string
    readUntil(token: string): string
    skipWhile(predicate: (input: string, index: number) => boolean): boolean
    readWhile(predicate: (input: string, index: number) => boolean): string
    readAll(delim: (input: string, index: number) => boolean): string[]
    isDone(): boolean
    clone(input?: string): this
    restart(input: string): this
    consume(token: string): boolean
    consume<T extends string>(tokens: T[]): T | null
    matches(token: string): boolean
    matches<T extends string>(tokens: T[]): T | null
    matches(predicate: (input: string, index: number) => boolean): boolean
}
const genericParserPrototype: Omit<GenericParser, "index" | "input"> & ThisType<GenericParser> = {
    skipUntil(predicate: string | ((input: string, index: number) => boolean)) {
        if (typeof predicate == "string") {
            const search = predicate
            predicate = (v, i) => v.startsWith(search, i)
        }

        while (this.index < this.input.length) {
            if (predicate(this.input, this.index)) {
                return true
            }
            this.index++
        }

        return false
    },
    readUntil(predicate: string | ((input: string, index: number) => boolean)) {
        if (typeof predicate == "string") {
            const search = predicate
            predicate = (v, i) => v.startsWith(search, i)
        }

        let start = this.index
        this.skipUntil(predicate)
        let end = this.index

        return this.input.slice(start, end)
    },
    skipWhile(predicate) {
        return this.skipUntil((v, i) => !predicate(v, i))
    },
    readWhile(predicate) {
        return this.readUntil((v, i) => !predicate(v, i))
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
    matches(token: string | string[] | ((input: string, index: number) => boolean)): any {
        if (typeof token == "function") {
            return token(this.input, this.index)
        }

        if (token instanceof Array) {
            for (const element of token) {
                if (this.matches(element)) {
                    return element
                }
            }
            return null
        }

        if (this.input.startsWith(token, this.index)) {
            return true
        }

        return false
    },
    consume(token: string | string[]): any {
        if (token instanceof Array) {
            for (const element of token) {
                if (this.consume(element)) {
                    return element
                }
            }
            return null
        }

        if (this.input.startsWith(token, this.index)) {
            this.index += token.length
            return true
        }

        return false
    },
    getCurrent() { return this.input[this.index] },
    at(offset) { return this.index + offset < this.input.length ? this.input[this.index + offset] : "" }
}

const GenericParser = function GenericParser<T = {}>(this: GenericParser, input: string = "", extend?: T & ThisType<T & GenericParser>) {
    return Object.assign(
        this,
        { input, index: 0 },
        extend
    ) as T & GenericParser
} as unknown as { new <T = {}>(input?: string, extend?: T & ThisType<T & GenericParser>): T & GenericParser }

GenericParser.prototype = genericParserPrototype

export { GenericParser }
