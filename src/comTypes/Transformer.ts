import { Readwrite } from "./types"
import { shallowClone } from "./util"

const _SINGLE_ELEMENT = -1
const _DONE = -2

export abstract class Transformer<T> {
    protected _target: T[] | T | null = null
    protected _result: T[] | T | null = null
    protected _index = -1
    /** Currently processed value */
    protected _value: T = null!

    public get wasModified() { return this._target != this._result }
    public readonly wasDropped: boolean = false

    /** Returns if there are no more items to process */
    public isDone() {
        if (this._index == _SINGLE_ELEMENT) return false
        if (this._index == _DONE) return true
        if (this._index < (this._target as T[]).length) return false
        return true
    }

    /** Selects the next value for processing, throws `RangeError` if there are no more elements */
    public next() {
        (this as Readwrite<this>).wasDropped = false

        if (this._index == _SINGLE_ELEMENT) {
            this._result = this._target
            this._target = null
            this._index = _DONE
            return this._value = this._result as T
        }

        if (this._index >= 0 && this._index < (this._target as T[]).length) {
            const element = (this._target as T[])[this._index++]

            if (this.wasModified) {
                (this._result as T[]).push(element)
            }

            return this._value = element
        }

        throw new RangeError("No more elements available")
    }

    /** Gets what the next value for processing would be, throws `RangeError` if there are no more elements */
    public peek() {
        if (this._index == _SINGLE_ELEMENT) {
            return this._target as T
        }

        if (this._index >= 0 && this._index < (this._target as T[]).length) {
            return (this._target as T[])[this._index]
        }

        throw new RangeError("No more elements available")
    }

    /** Removes current value from processing result */
    public drop() {
        if (this.wasDropped) return

        (this as Readwrite<this>).wasDropped = true
        if (this._index <= _SINGLE_ELEMENT) {
            this._result = null
        } else if (this._index >= 0) {
            if (!this.wasModified) {
                this._result = (this._target as T[]).slice(0, this._index - 1)
            } else {
                (this._result as T[]).pop()
            }
        }
    }

    /** Replaces current value in the processing result */
    public replace(element: T) {
        this._value = element

        if (this.wasDropped) {
            (this as Readwrite<this>).wasDropped = false
            if (this._index <= _SINGLE_ELEMENT) {
                this._result = element
            } else {
                (this._result as T[]).push(element)
            }
            return
        }

        if (this._index <= _SINGLE_ELEMENT) {
            this._result = element
        } else if (this._index >= 0) {
            if (!this.wasModified) {
                this._result = [...(this._target as T[]).slice(0, this._index - 1), element]
            } else {
                (this._result as T[]).splice(-1, 1, element)
            }
        }
    }

    /** Transforms the value and returns the transformed result. Check `.wasDropped` to see if you should throw away the result */
    public transform(element: T) {
        this._index = _SINGLE_ELEMENT
        this._target = element
        this._result = element
        this.process()
        return this._result as T
    }

    /** Transforms the array and returns the transformed array */
    public transformArray(elements: T[]) {
        this._index = 0
        this._target = elements
        this._result = elements
        this.process()
        return this._result as T[]
    }

    /** Override to return children of an element for transformation, or `null` if there are no children to transform */
    protected abstract _getChildren(): T[] | null
    /** Override to replace the current value with a new one, with updated children by calling `this.replace(...)` */
    public abstract applyChildren(children: T[]): void

    public processChildren<TSelf extends Transformer<T> = Transformer<T>>(this: TSelf, params?: Partial<TSelf>) {
        const children = this._getChildren()
        if (children == null) return

        const child = shallowClone(this)
        if (params) Object.assign(child, params)

        const result = child.transformArray(children)

        if (child.wasModified) {
            this.applyChildren(result)
        }
    }

    /** Override to modify how elements are transformed. You would most likely only want to add a preamble and call `super.process()`
     * @example
     * public override process() {
     *   this.currentFrame = this.inheritedFrame
     *   super.process()
     * }
     */
    public process() {
        while (!this.isDone()) {
            this.next()
            this.processElement()
        }
    }

    /** Override to transform an element. Don't forget to call `this.processChildren()` or `super.processElement()` to process children of the current element. */
    public processElement() {
        this.processChildren()
    }
}
