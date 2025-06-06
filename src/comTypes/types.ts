export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never
export type AbstractConstructor<T = any> = abstract new (...args: any[]) => T
export type Constructor<T = any> = { new(...args: any[]): T }
export type ConcreteConstructor<T extends abstract new (...args: any) => any> = new (...args: ConstructorParameters<T>) => InstanceType<T>
export type Depromisify<T> = T extends Promise<infer U> ? Depromisify<U> : T
export type FilterPublic<T> = Pick<T, keyof T>
export type Readwrite<T> = { -readonly [P in keyof T]: T[P] }
export type Entry<T extends Record<any, any>> = [keyof T, T[keyof T]]
export type Values<T extends Record<any, any>> = T[keyof T]
export type FilterBy<T, K extends keyof any, F> = T extends { [P in K]: F } ? T : never
export type ExcludeBy<T, K extends keyof any, F> = T extends { [P in K]: F } ? never : T
export type ToReadonlyCollection<T> =
    T extends ReadonlyMap<infer K, infer U> ? ReadonlyMap<K, U> :
    T extends ReadonlySet<infer U> ? ReadonlySet<U> :
    T extends ReadonlyArray<infer U> ? ReadonlyArray<U> :
    T
export type ToDeepReadonlyCollection<T> =
    T extends ReadonlyMap<infer K, infer U> ? ReadonlyMap<K, ToDeepReadonlyCollection<U>> :
    T extends ReadonlySet<infer U> ? ReadonlySet<ToDeepReadonlyCollection<U>> :
    T extends ReadonlyArray<infer U> ? ReadonlyArray<ToDeepReadonlyCollection<U>> :
    T
export type ReplaceProp<T, K extends keyof any, V> = Omit<T, K> & { [P in K]: V }
export type ShiftTuple<T> = T extends [any, ...infer U] ? U : []
export type MapKey<T> = T extends Map<infer U, any> ? U : never
export type MapValue<T> = T extends Map<any, infer U> ? U : never
export type DeepPartial<T> = T extends object ? {
    [P in keyof T]?: DeepPartial<T[P]>
} : T
