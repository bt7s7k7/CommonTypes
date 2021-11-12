
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

    public *[Symbol.iterator]() {
        for (var node = this.start; node != null; node = node.next) {
            yield [node, node.value]
        }
    }

    public *values() {
        for (var node = this.start; node != null; node = node.next) {
            yield node.value
        }
    }

    public *keys() {
        for (var node = this.start; node != null; node = node.next) {
            yield node
        }
    }
}

export namespace LinkedList {
    export class Node<T> {
        constructor(
            public value: T,
            public prev: Node<T> | null,
            public next: Node<T> | null
        ) { }
    }
}