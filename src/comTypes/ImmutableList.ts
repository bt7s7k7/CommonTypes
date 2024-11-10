import { unreachable } from "./util"

const _EMPTY = Symbol.for("kompa.imList.empty")

export class ImmutableList<T> {
    public readonly length: number

    public add(value: T): ImmutableList<T> {
        if (this.length == 0) {
            return new ImmutableList(value, null, null)
        } else {
            return new ImmutableList(value, this, null)
        }
    }

    public addStart(value: T) {
        if (this.length == 0) {
            return new ImmutableList(value, null, null)
        } else {
            return new ImmutableList(value, null, this)
        }
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        if (this.length == 0) return
        if (this._prev) yield* this._prev[Symbol.iterator]()
        if (this._value != _EMPTY) yield this._value
        if (this._next) yield* this._next[Symbol.iterator]()
    }

    public concat(list: ImmutableList<T>) {
        if (this.length == 0) return list
        if (list.length == 0) return this

        if (this.length == 1) {
            return new ImmutableList(this._value, null, list)
        }

        if (list.length == 1) {
            return new ImmutableList(list._value, this, null)
        }

        return new ImmutableList(_EMPTY, this, list)
    }

    public toArray() {
        return [...this]
    }

    public reduce<R>(reducer: (previousValue: R, currentValue: T, index: number) => R, start: R): R {
        let value = start
        let index = 0
        for (const element of this) {
            value = reducer(value, element, index)
        }

        return value
    }

    public join(delim?: string) {
        return this.toArray().join(delim)
    }

    public getFirst(): T {
        if (this.length == 0) throw new RangeError("Cannot get first value of an ImmutableList")
        if (this._prev) return this._prev.getFirst()
        if (this._value == _EMPTY) unreachable()
        return this._value
    }

    public getLast(): T {
        if (this.length == 0) throw new RangeError("Cannot get last value of an ImmutableList")
        if (this._next) return this._next.getLast()
        if (this._value == _EMPTY) unreachable()
        return this._value
    }

    protected constructor(
        protected readonly _value: T | typeof _EMPTY = _EMPTY,
        protected readonly _prev: ImmutableList<T> | null = null,
        protected readonly _next: ImmutableList<T> | null = null,
    ) {
        this.length = (
            (_value == _EMPTY ? 0 : 1) +
            (this._prev != null ? this._prev.length : 0) +
            (this._next != null ? this._next.length : 0)
        )
    }

    public static from<T>(values?: Iterable<T>) {
        let node: ImmutableList<T> | null = null

        if (values) {
            for (const value of values) {
                if (node == null) {
                    node = new ImmutableList(value, null, null)
                } else {
                    node = new ImmutableList(value, node, null)
                }
            }
        }

        return node ?? this.empty<T>()
    }

    protected static _EMPTY_LIST = new ImmutableList<any>(_EMPTY, null, null)
    public static empty<T>() {
        return this._EMPTY_LIST as ImmutableList<T>
    }
}
