export class GenericParser {
    public index = 0

    public getCurrent() {
        return this.input[this.index]
    }

    public at(offset: number) {
        return this.index + offset < this.input.length && this.index + offset >= 0 ? this.input[this.index + offset] : ""
    }

    public skipUntil(predicate: (input: string, index: number) => boolean): boolean
    public skipUntil(token: string): boolean
    public skipUntil(predicate: string | ((input: string, index: number) => boolean)) {
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
    }

    public readUntil(predicate: (input: string, index: number) => boolean): string
    public readUntil(token: string): string
    public readUntil(predicate: string | ((input: string, index: number) => boolean)) {
        if (typeof predicate == "string") {
            const search = predicate
            predicate = (v, i) => v.startsWith(search, i)
        }

        let start = this.index
        this.skipUntil(predicate)
        let end = this.index

        return this.input.slice(start, end)
    }

    public skipWhile(predicate: (input: string, index: number) => boolean) {
        return this.skipUntil((v, i) => !predicate(v, i))
    }

    public readWhile(predicate: (input: string, index: number) => boolean) {
        return this.readUntil((v, i) => !predicate(v, i))
    }

    public readAll(delim: (input: string, index: number) => boolean) {
        const tokens: string[] = []
        while (!this.isDone()) {
            tokens.push(this.readUntil(delim))
            if (!this.isDone()) {
                tokens.push(this.input[this.index])
                this.index++
            }
        }
        return tokens
    }

    public isDone() {
        return this.index >= this.input.length
    }

    public clone(input?: string) {
        const clone = Object.assign(Object.create(this.constructor.prototype), this) as this
        if (input != undefined) {
            clone.input = input
            clone.index = 0
        }

        return clone
    }

    public restart(input: string) {
        this.input = input
        this.index = 0
        return this
    }

    public consume(token: string): boolean
    public consume<T extends string>(tokens: T[]): T | null
    public consume(token: string | string[]): any {
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
    }

    public matches(token: string): boolean
    public matches<T extends string>(tokens: T[]): T | null
    public matches(predicate: (input: string, index: number) => boolean): boolean
    public matches(token: string | string[] | ((input: string, index: number) => boolean)): any {
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
    }

    constructor(
        public input: string
    ) { }
}
