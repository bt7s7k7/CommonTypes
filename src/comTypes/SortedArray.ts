import { binarySearch, insertSorted } from "./util"

export class SortedArray<T> {
    protected array: T[] = []

    public get length() { return this.array.length }
    public get(index: number) {
        if (index < 0) return this.array[this.array.length + index]
        return this.array[index]
    }

    public add(value: T) {
        insertSorted(value, this.array, this.comparator)
    }

    public indexOf(value: T) {
        return binarySearch(this.array, (a) => this.comparator(value, a))
    }

    public contains(value: T) {
        return this.indexOf(value) >= 0
    }

    public delete(value: T) {
        const index = this.indexOf(value)
        if (index < 0) return false

        this.array.splice(index, 1)
        return true
    }

    public splice(index: number, deleteCount?: number, ...insert: T[]) {
        if (deleteCount == undefined) {
            this.array.splice(index)
        } else {
            this.array.splice(index, deleteCount)
        }

        for (const value of insert) {
            this.add(value)
        }
    }

    public clear() {
        this.array.length = 0
    }

    public [Symbol.iterator]() {
        return this.array[Symbol.iterator]()
    }

    constructor(
        public comparator: (a: T, target: T) => number
    ) { }

    public static adopt<T>(array: T[], comparator: (a: T, target: T) => number) {
        const result = new SortedArray<T>(comparator)
        result.array = array

        return result
    }

    public static from<T>(source: IterableIterator<T>, comparator: (a: T, target: T) => number) {
        const array = [...source]

        const result = new SortedArray<T>(comparator)
        result.array = array

        return result
    }
}