import { AbstractConstructor } from "./types"
import { asError, toString } from "./util"

export class PredicateFailedError extends Error {
    name = "PredicateFailedError"
}

export class ErrorResultUnwrapError extends Error {
    name = "ErrorResultUnwrapError"
}

export class Optional<T> {
    protected _rejected: Error | null = null
    protected _value: any

    public get rejected() { return this._rejected }

    public else<R>(factory: (error: Error) => R): Optional<T | (R extends Optional<infer U> ? U : R)> {
        if (this._rejected) {
            const value = factory(this._rejected)
            if (value instanceof Optional) {
                if (value._rejected) {
                    this._rejected = value._rejected
                } else {
                    this._value = value._value
                }
            } else {
                this._value = value
            }
        }
        return this
    }

    public effect<A extends any[]>(thunk: (value: T, ...args: A) => void, ...args: A): Optional<T> {
        if (this._rejected) return this as Optional<T>
        thunk(this._value, ...args)
        return this as Optional<T>
    }

    public unwrap(): T {
        if (this._rejected) throw this._rejected
        return this._value
    }

    public tryUnwrap(): T | null {
        if (this._rejected) return null
        return this._value
    }

    public then<A extends any[], R>(thunk: (value: T, ...args: A) => R, ...args: A): Optional<R extends Optional<infer U> ? U : R> {
        if (!this._rejected) {
            const value = thunk(this._value, ...args)
            if (value instanceof Optional) {
                if (value._rejected) {
                    this._rejected = value._rejected
                } else {
                    this._value = value._value
                }
            } else {
                this._value = value
            }
        }
        return this as any
    }

    public filter<R>(predicate: (value: any) => value is R, msg?: string): Optional<R extends Optional<infer U> ? U : R>
    public filter(predicate: (value: T) => boolean, msg?: string): Optional<T>
    public filter(predicate: (value: T) => boolean, msg = "Value did not match predicate") {
        if (this._rejected) return this as any

        const match = predicate(this._value)
        if (!match) {
            this._rejected = new PredicateFailedError(msg)
            this._value = null
        }

        return this as any
    }

    public assertType<R>(): Optional<R> {
        return this as any
    }

    public rejectType(type: AbstractConstructor, msg = `Value was of type "${type.name}"`): Optional<T> {
        if (this._rejected) return this

        if (this._value instanceof type) {
            this._rejected = new PredicateFailedError(msg)
            this._value = null
        }

        return this
    }

    public filterType<R>(type: AbstractConstructor<R>, msg = `Value was not of type "${type.name}"`): Optional<R> {
        if (this._rejected) return this as any

        if (!(this._value instanceof type)) {
            this._rejected = new PredicateFailedError(msg)
            this._value = null
        }

        return this as any
    }

    public rejectValue<R>(value: R, msg = `Value was "${toString(value)}"`): Optional<Exclude<T, R>> {
        if (!this._rejected) {
            if (this._value == value)
                if (this._value == value) {
                    this._rejected = new PredicateFailedError(msg)
                    this._value = null
                }
        }

        return this as any
    }

    protected constructor(value: T) {
        this._value = value
    }

    public static value<T>(value: T) {
        return new Optional(value as T extends Optional<infer U> ? U : T)
    }

    public static rejected<T>(error: Error) {
        const result = new Optional<T>(null!)
        result._rejected = error
        return result
    }

    public static pcall<A extends any[], T>(thunk: (...args: A) => T, ...args: A) {
        try {
            return Optional.value(thunk(...args))
        } catch (err) {
            return Optional.rejected<never>(asError(err))
        }
    }
}

export class Result<T, E extends { kind: string }> {
    protected _error: E | null = null
    protected _value: T | null = null

    public get error() { return this._error }

    protected _getError() {
        return new ErrorResultUnwrapError(`Tried to unwrap result with error of "${this._error!.kind}"`)
    }

    public unwrap() {
        if (this._error != null) throw this._getError()
        return this._value! as T
    }

    public toOptional(): Optional<T> {
        if (this._error) return Optional.rejected(this._getError())
        return Optional.value(this._value!) as Optional<T>
    }

    public static error<K extends string>(kind: K): Result<never, { kind: K }>
    public static error<K extends string, P extends object>(kind: K, options: P): Result<never, { kind: K } & P>
    public static error(kind: string, options?: any) {
        const result = new Result<never, never>()
        result._error = { ...options, kind }
        return result as any
    }

    public static value<T>(value: T) {
        const result = new Result<T, never>()
        result._value = value
        return result
    }
}
