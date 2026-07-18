export type Result<TOk, TError> = [TOk, null] | [null, TError]

export type ValueOf<T extends Record<any, any>> = T[keyof T]

export type Fn<TArgs extends Array<any>, TReturn> = (...args: TArgs) => TReturn
export type AnyFunction = (...args: any[]) => any

// prettier-ignore
export type EventMapFor<T extends Window | Document | HTMLElement> =
    T extends Window ? WindowEventMap :
    T extends Document ? DocumentEventMap : 
    T extends HTMLElement ? HTMLElementEventMap
    : never

// prettier-ignore
export type InferCollectionType<T extends Set<unknown> | Array<unknown>> =
    T extends Set<infer V> ? V :
    T extends Array<infer V> ? V :
    never

// prettier-ignore
export type InferGuardType<T> = 
    T extends (x: any) => x is infer V ? V : never

export type Or<A, B> = [A] extends [never] ? B : A

export type Unsub = () => void

export type Guard<T, TOther = unknown> = (ctx: T | TOther) => ctx is T

export type InferMapKey<T extends Map<any, any>> =
    T extends Map<infer K, any> ? K : never
export type InferMapValue<T extends Map<any, any>> =
    T extends Map<any, infer V> ? V : never
