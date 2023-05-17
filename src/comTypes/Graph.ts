import { MultiMap } from "./MultiMap"

function makeEdgeID(from: Graph.Node<any>, to: Graph.Node<any>) {
    let fromID = from.id
    let toID = to.id
    if (fromID > toID) [fromID, toID] = [toID, fromID]

    return fromID + ">" + toID
}

export class Graph<T = void> {
    protected _nodes = new Set<Graph.Node<T>>();
    protected _nextID = 0;
    protected _edges = new MultiMap(MultiMap.entity<Graph.Edge<T>>(), {
        "from": MultiMap.sharedKey<Graph.Node<T>>(),
        "to": MultiMap.sharedKey<Graph.Node<T>>(),
        "connects": MultiMap.sharedMultipleKey((v: Graph.Edge<T>) => [v.from, v.to]),
        "id": MultiMap.key<string>()
    });

    public addNode(userData: T) {
        const node = new Graph.Node<T>(this, userData)
        this._nodes.add(node)

        return node
    }

    public removeNode(node: Graph.Node<T>) {
        this._nodes.delete(node)

        for (const edge of this._edges.get("connects", node)) {
            this._edges.delete(edge)
        }
    }

    public nodes() {
        return this._nodes[Symbol.iterator]()
    }

    public edges() {
        return this._edges.values()
    }

    public get size() { return this._nodes.size }

    public addEdge(from: Graph.Node<T>, to: Graph.Node<T>) {
        if (!this._nodes.has(from)) throw new RangeError("Graph does not have node")
        if (!this._nodes.has(to)) throw new RangeError("Graph does not have node")
        if (from == to) throw new RangeError("Cannot create edge to self")

        const edge: Graph.Edge<T> = { from, to, id: makeEdgeID(from, to) }
        if (this._edges.tryGet("id", edge.id) != null) return
        this._edges.add(edge)

        return edge
    }

    public removeEdge(edge: Graph.Edge<T>): boolean
    public removeEdge(from: Graph.Node<T>, to: Graph.Node<T>): boolean
    public removeEdge(...args: any[]) {
        let edge: Graph.Edge<T>

        if (args.length == 1) {
            edge = args[0]
        } else {
            const [from, to] = args
            const id = makeEdgeID(from, to)
            edge = this._edges.get("id", id)
        }

        return this._edges.delete(edge)
    }

    public hasEdge(from: Graph.Node<T>, to: Graph.Node<T>) {
        const id = makeEdgeID(from, to)
        return this._edges.tryGet("id", id) != null
    }

    public hasNode(node: Graph.Node<T>) {
        return this._nodes.has(node)
    }

    public clear() {
        this._edges.clear()
        this._nodes.clear()
        this._nextID = 0
    }

    public clearEdges() {
        this._edges.clear()
    }

    constructor(
        copy?: Graph<T>,
        userDataCopy?: (v: T) => T
    ) {
        if (copy) {
            const nodeById = new Map<number, Graph.Node<T>>()
            for (const node of copy.nodes()) {
                const newNode = new Graph.Node<T>(this, userDataCopy ? userDataCopy(node.userData) : node.userData, node.id)
                nodeById.set(newNode.id, newNode)
                this._nodes.add(newNode)
            }

            for (const edge of copy.edges()) {
                const from = nodeById.get(edge.from.id)!
                const to = nodeById.get(edge.to.id)!
                this.addEdge(from, to)
            }

            this._nextID = copy._nextID
        }
    }
}

export namespace Graph {
    export class Node<T = void> {

        public neighbours(): ReadonlySet<Node<T>> {
            return new Set([...this.graph["_edges"].get("connects", this)].map(({ from, to }) => from == this ? to : from))
        }

        public destroy() {
            this.graph.removeNode(this)
        }

        public isConnectedTo(other: Graph.Node<T>) {
            return this.graph.hasEdge(this, other)
        }

        constructor(
            public readonly graph: Graph<T>,
            public userData: T,
            public readonly id = graph["_nextID"]++
        ) { }
    }

    export interface Edge<T = void> {
        id: string
        from: Graph.Node<T>
        to: Graph.Node<T>
    }
}
