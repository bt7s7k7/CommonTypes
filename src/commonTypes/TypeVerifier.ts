
export interface TypeVerifier<T> {
    validate(value: unknown): T
}

export namespace TypeVerifier {
    export type Value<T extends TypeVerifier<any>> = T extends TypeVerifier<infer U> ? U : never

    const VERIFY = Symbol("verify")
    const IS_OPTIONAL = Symbol("isOptional")

    function makeProperty<T>(verifier: (value: any) => true | string): Property<T> {
        return {
            [VERIFY]: (value) => {
                const valid = verifier(value)
                if (typeof valid == "string") {
                    throw new TypeVerificationError(valid)
                }
            },
            [IS_OPTIONAL]: false,
            array() {
                return propertyBuilder.array(() => this)
            },
            record() {
                return propertyBuilder.record(() => this)
            },
            optional() {
                return Object.assign(Object.create(this), { [IS_OPTIONAL]: true })
            }
        }
    }

    const propertyBuilder: PropertyBuilder = {
        boolean: () => makeProperty((v) => typeof v == "boolean" || "Expected boolean"),
        number: () => makeProperty((v) => typeof v == "number" || "Expected number"),
        string: () => makeProperty((v) => typeof v == "string" || "Expected string"),
        object: () => {
            const properties: Record<string, Property<any>> = {}

            const base = makeProperty((value) => {
                if (!value || typeof value != "object" || value instanceof Array) throw new TypeVerificationError("Expected object")
                for (const [key, prop] of Object.entries(properties)) {
                    if (key in value) {
                        try {
                            prop[VERIFY](value[key])
                        } catch (err) {
                            if (err instanceof TypeVerificationError) {
                                if (!prop[IS_OPTIONAL] || value[key] != null) {
                                    err.appendPath(key)
                                    throw err
                                }
                            } else throw err
                        }
                    } else {
                        if (!prop[IS_OPTIONAL]) {
                            throw new TypeVerificationError(`Missing property "${key}"`)
                        }
                    }
                }

                return true
            })

            return {
                ...base,
                prop(key, factory) {
                    const prop = factory(propertyBuilder)
                    properties[key] = prop
                    return this
                }
            }

        },
        array: (factory) => {
            const prop = factory(propertyBuilder)

            return makeProperty((value) => {
                if (!(value instanceof Array)) throw new TypeVerificationError("Expected array")
                for (let i = 0, len = value.length; i < len; i++) {
                    try {
                        prop[VERIFY](value[i])
                    } catch (err) {
                        if (err instanceof TypeVerificationError) {
                            err.appendPath(`[${i}]`)
                            throw err
                        } else throw err
                    }
                }

                return true
            })
        },
        record: (factory) => {
            const prop = factory(propertyBuilder)

            return makeProperty((value) => {
                if (!value || typeof value != "object" || value instanceof Array) throw new TypeVerificationError("Expected record")
                for (const [key, entry] of Object.entries(value)) {
                    try {
                        prop[VERIFY](entry)
                    } catch (err) {
                        if (err instanceof TypeVerificationError) {
                            err.appendPath(`[${key}]`)
                            throw err
                        } else throw err
                    }
                }

                return true
            })
        }
    }

    export function create(): Builder<{}> {
        return {
            ...propertyBuilder.object() as Builder<{}>,
            build() {
                return {
                    validate: (value: any) => {
                        this[VERIFY](value)
                        return value
                    }
                }
            }
        }
    }

    export interface Property<T> {
        [VERIFY](value: any): void
        [IS_OPTIONAL]: boolean
        array(): Property<T[]>
        record(): Property<Record<string, T>>
        optional(): Property<T | null>
    }

    export interface PropertyBuilder {
        number(): Property<number>
        string(): Property<string>
        boolean(): Property<boolean>
        object(): ObjectProperty<{}>
        array<A>(factory: (v: PropertyBuilder) => Property<A>): Property<A[]>
        record<A>(factory: (v: PropertyBuilder) => Property<A>): Property<Record<string, A>>
    }

    export interface ObjectProperty<T extends Record<string, any>> extends Property<T> {
        prop<K extends string, A>(key: K, factory: (v: PropertyBuilder) => Property<A>): ObjectProperty<T & { [P in K]: A }>
    }

    export interface Builder<T extends Record<string, any>> extends Omit<ObjectProperty<T>, "prop"> {
        prop<K extends string, A>(key: K, factory: (v: PropertyBuilder) => Property<A>): Builder<T & { [P in K]: A }>
        build(): TypeVerifier<T>
    }
}

export class TypeVerificationError extends Error {

    public appendPath(path: string) {
        this.setPath(this.path ? `${path}.${this.path}` : path)
    }
    public setPath: (path: string) => void

    protected path = ""

    constructor(
        message: string
    ) {
        super("__MSG")

        const oldMessage = this.message
        const oldStack = this.stack ?? ""

        this.setPath = (newPath) => {
            this.path = newPath
            const newMessage = `Invalid type at .${this.path} : ${message}`
            this.message = oldMessage.replace(/__MSG/, newMessage)
            this.stack = oldStack.replace(/__MSG/, newMessage)
        }

        this.setPath(this.path)
    }
}