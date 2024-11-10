
export class LinkedList<T> {
    public start: LinkedList.Node<T> | null = null
    public end: LinkedList.Node<T> | null = null

    public push(value: T) {
        if (this.end) {
            return this.end = this.end.next = new LinkedList.Node(value, this.end, null)
        } else {
            return this.start = this.end = new LinkedList.Node(value, null, null)
        }
    }

    public unshift(value: T) {
        if (this.start) {
            return this.start = this.start.prev = new LinkedList.Node(value, this.start, null)
        } else {
            return this.start = this.end = new LinkedList.Node(value, null, null)
        }
    }

    public pop() {
        if (!this.end) return null
        const ret = this.end
        this.end = this.end.prev
        return ret
    }

    public shift() {
        if (!this.start) return null
        const ret = this.start
        this.start = this.start.next
        return ret
    }

    public insert(at: LinkedList.Node<T> | null, value: T) {
        if (!at) return this.unshift(value)

        const node = new LinkedList.Node(value, at, at.next)
        if (at.next) at.next.prev = node
        at.next = node
        if (at == this.end) this.end = node
        return node
    }

    public delete(node: LinkedList.Node<T>) {
        if (node.next) node.next.prev = node.prev
        if (node.prev) node.prev.next = node.next
        if (node == this.end) this.end = node.prev
        if (node == this.start) this.start = node.next
    }

    public deleteRange(start: LinkedList.Node<T> | null | undefined, end: LinkedList.Node<T> | null | undefined) {
        start ??= this.start
        end ??= this.end
        if (start == null || end == null) return

        if (end.next) end.next.prev = start.prev
        if (start.prev) start.prev.next = end.next
        if (end == this.end) this.end = start.prev
        if (start == this.start) this.start = end.next
    }

    public clear() {
        this.end = null
        this.start = null
    }

    public isEmpty() {
        return this.start == null
    }

    public *[Symbol.iterator]() {
        for (let node = this.start; node != null; node = node.next) {
            yield [node, node.value] as [LinkedList.Node<T>, T]
        }
    }


    public *values() {
        for (let node = this.start; node != null; node = node.next) {
            yield node.value
        }
    }

    public *keys() {
        for (let node = this.start; node != null; node = node.next) {
            yield node
        }
    }

    constructor(source?: Iterable<T>) {
        if (source != null) {
            for (const element of source) {
                this.push(element)
            }
        }
    }
}

export namespace LinkedList {
    export class Node<T> {
        public *[Symbol.iterator]() {
            for (let node: Node<T> | null = this; node != null; node = node.next) {
                yield [node, node.value] as [LinkedList.Node<T>, T]
            }
        }

        public *values() {
            for (let node: Node<T> | null = this; node != null; node = node.next) {
                yield node.value
            }
        }

        public *keys() {
            for (let node: Node<T> | null = this; node != null; node = node.next) {
                yield node
            }
        }

        constructor(
            public value: T,
            public prev: Node<T> | null,
            public next: Node<T> | null,
        ) { }
    }
}
