import { arrayRemove } from "./util"

export class Chain<T, R> {
    public static readonly NEXT = Symbol.for("kompa.chain.next")

    protected _handlers: Chain.Handler<T, R>[] = []

    public appendHandler(handler: Chain.Handler<T, R>) {
        this._handlers.push(handler)
        return handler
    }

    public prependHandler(handler: Chain.Handler<T, R>) {
        this._handlers.unshift(handler)
        return handler
    }

    public removeHandler(handler: Chain.Handler<T, R>) {
        return arrayRemove(this._handlers, handler)
    }

    public evaluate(input: T) {
        for (const handler of this._handlers) {
            let result = handler(input, Chain.NEXT)
            if (result == Chain.NEXT) continue
            return result
        }

        return Chain.NEXT
    }
}

export namespace Chain {
    export type Handler<T, R> = (input: T, next: typeof Chain["NEXT"]) => R | typeof Chain["NEXT"]
}
