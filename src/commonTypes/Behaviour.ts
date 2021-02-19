import { Constructor } from "./types"

export interface Behaviour<A, R> {
    new(options: A): R,
    types: Record<string, Behaviour.Type>
}


export namespace Behaviour {
    export type PayloadBase = Record<string, any>
    export type DataBase = Record<string, PayloadBase>

    export declare const DATA_SYMBOL: unique symbol
    export declare const LATER_SYMBOL: unique symbol

    export interface Builder<D, A, R> {
        extend<AA, AR>(behaviour: Behaviour<AA, AR>): Builder<D, A & AA, R & AR>
        impl<K extends string, T extends Constructor>(name: K, callback: (base: Constructor<R & { [DATA_SYMBOL]: D }>, data: typeof DATA_SYMBOL) => T): Behaviour<A & { [P in K]: D }, R & Omit<InstanceType<T>, typeof DATA_SYMBOL>>
    }

    export function create<D = {}>(): Builder<D, {}, {}> {
        function make(types: Record<string, Behaviour.Type>): Builder<any, any, any> {
            return {
                extend(behaviour): any {
                    const resultTypes = { ...types }
                    for (const [key, value] of Object.entries(behaviour.types)) {
                        if (!(key in resultTypes)) {
                            resultTypes[key] = value
                        }
                    }
                    return make(resultTypes)
                },
                impl(name, callback): any {
                    let superClass: Constructor = class {
                        constructor(args: any) {
                            for (const [key, { data: dataSymbol }] of Object.entries(symbols)) {
                                const data = args[key]
                                // @ts-ignore
                                this[dataSymbol] = data
                            }
                        }
                    }

                    const implType: Type = {
                        name,
                        create: callback
                    }

                    const realTypes = { ...types, [name]: implType }

                    const symbols: Record<string, { data: typeof DATA_SYMBOL }> = {}

                    for (const ctor of Object.values(realTypes)) {
                        const data: typeof DATA_SYMBOL = Symbol(`${ctor.name}!data`) as typeof DATA_SYMBOL
                        symbols[ctor.name] = { data }

                        superClass = ctor.create(superClass, data)
                    }

                    const behaviourCtor = superClass

                    Object.assign(behaviourCtor, {
                        types: realTypes
                    } as Partial<Behaviour<any, any>>)

                    return behaviourCtor
                }
            }
        }

        return make({})
    }

    export interface Type {
        name: string,
        create: (base: Constructor<{ [DATA_SYMBOL]: any }>, data: typeof DATA_SYMBOL) => Constructor
    }
}

