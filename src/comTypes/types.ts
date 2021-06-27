export type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (x: infer R) => any ? R : never
export type Constructor<T = any> = { new(...args: any[]): T }
export type Depromisify<T> = T extends Promise<infer U> ? Depromisify<U> : T
export type FilterPublic<T> = Pick<T, keyof T>
