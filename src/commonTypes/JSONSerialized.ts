declare const KEY: unique symbol

export interface JSONSerialized<T> extends String {
    [KEY]?: T
}