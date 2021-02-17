import { JSONSerialized } from "./JSONSerialized"

export namespace SafeJSON {
    export function parse<T>(text: JSONSerialized<T>, reviver?: (this: any, key: string, value: any) => any): T {
        return JSON.parse(text as string, reviver)
    }
    export function stringify<T>(value: T, replacer?: (this: any, key: string, value: any) => any, space?: string | number): JSONSerialized<T>;
    export function stringify<T>(value: T, replacer?: (number | string)[] | null, space?: string | number): JSONSerialized<T>;
    export function stringify<T>(value: T, replacer?: any, space?: string | number): JSONSerialized<T> {
        return JSON.stringify(value, replacer, space)
    }
}
