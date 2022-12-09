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
        let index = binarySearch(this.array, (a) => this.comparator(value, a))
        if (index < 0) return -1
        while (index < this.length) {
            if (this.array[index] == value) return index

            index++
            if (this.comparator(value, this.array[index]) != 0) {
                break
            }
        }

        return -1
    }

    public contains(value: T) {
        return this.indexOf(value) != -1
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

    public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
        return this.array.map(callbackfn, thisArg)
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