function assignOwnProperties<A, B>(a: A, b: B): A & B {
    Object.getOwnPropertyNames(b).forEach(v => (a as any)[v] = (b as any)[v])
    return a as A & B
}

let hydrateData: any = null

export function inplaceSubclass<T, D extends T, A extends any[]>(base: T, extend: { new(...args: A): D }, args: A): D {
    if (Object.getPrototypeOf(base) != Object.getPrototypeOf(extend.prototype)) throw new Error(`Tried to subclass to a not directly descendant class, current: ${Object.getPrototypeOf(base).constructor.name}, expected: ${Object.getPrototypeOf(extend.prototype).constructor.name}`)
    const fakeCtor = function FC() { } as unknown as { new(): T }
    fakeCtor.prototype = base

    Object.setPrototypeOf(base, extend.prototype)

    hydrateData = base
    const created = new extend(...args)
    assignOwnProperties(base, created)
    hydrateData = null

    return base as D
}

export namespace inplaceSubclass {
    export function base<T>(ctor: { new(...args: any[]): T }): { new(): T } {
        return Object.assign(function (this: any) {
            Object.setPrototypeOf(this, hydrateData)
        } as unknown as { new(): T }, { prototype: ctor.prototype })
    }
}