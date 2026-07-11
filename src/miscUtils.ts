export function split<T, TPass extends T = T, TFail extends T = T>(
    xs: T[],
    condition: (x: T) => boolean,
): [TPass[], TFail[]] {
    const pass = [] as TPass[]
    const fail = [] as TFail[]

    for (let x of xs) {
        if (condition(x)) {
            pass.push(x as TPass)
        } else {
            fail.push(x as TFail)
        }
    }

    return [pass, fail]
}

export function splitMap<T, TPass = T, TFail = T>(
    xs: T[],
    fn: (
        x: T,
    ) => { type: "pass"; value: TPass } | { type: "fail"; value: TFail },
): [TPass[], TFail[]] {
    const pass = [] as TPass[]
    const fail = [] as TFail[]

    for (let x of xs) {
        const mapped = fn(x)

        if (mapped.type === "pass") {
            pass.push(mapped.value)
        } else {
            fail.push(mapped.value)
        }
    }

    return [pass, fail]
}

// radash range(1, 0) yields [0] instead of []
// https://github.com/sodiray/radash/pull/463
export function range(a: number, b?: number, step?: number): number[] {
    let start, end
    if (b !== undefined) {
        start = a
        end = b
    } else {
        start = 0
        end = a
    }

    step = step ?? 1

    const xs = []
    for (let i = start; i < end; i += step) {
        xs.push(i)
    }

    return xs
}

export interface SleepUntilOpts {
    check: () => boolean
    tries?: number
    delay?: number
}

/** Defaults to 60 tries @ 50ms = 3s retry period */
export async function sleepUntil(opts: SleepUntilOpts) {
    const n = opts?.tries ?? 60
    for (let _ of range(n - 1)) {
        const value = opts.check()
        if (value) {
            return true
        }

        await sleep(opts.delay ?? 50)
    }

    return false
}

export async function sleep(timeMs: number) {
    return new Promise((resolve) => {
        setTimeout(() => resolve(null), timeMs)
    })
}

export function createRng(seed = "") {
    function hashString(seed: string) {
        let h = 2166136261
        for (let i = 0; i < seed.length; i++) {
            h ^= seed.charCodeAt(i)
            h = Math.imul(h, 16777619)
        }
        return h >>> 0
    }

    function mulberry32(seed: number) {
        return function () {
            let t = (seed += 0x6d2b79f5)
            t = Math.imul(t ^ (t >>> 15), t | 1)
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296
        }
    }

    return mulberry32(hashString(seed))
}

export type Fn<TArgs extends Array<any>, TReturn> = (...args: TArgs) => TReturn

export interface ThrottleOpts<TArgs extends Array<any>, TReturn> {
    fn: Fn<TArgs, TReturn>
    interval: number
}
export function throttle<TArgs extends Array<any>, TReturn>(
    opts: ThrottleOpts<TArgs, TReturn>,
): Fn<TArgs, void> {
    let lastCallTime = 0
    let pendingCallId = 0

    const wrapper: Fn<TArgs, void> = (...args) => {
        clearTimeout(pendingCallId)

        const now = Date.now()
        const elapsed = now - lastCallTime
        const remDelay = opts.interval - elapsed
        if (remDelay <= 0) {
            opts.fn(...args)
            lastCallTime = now
        } else {
            pendingCallId = window.setTimeout(() => {
                opts.fn(...args)
                lastCallTime = now
            }, remDelay)
        }
    }

    return wrapper
}

export function inIvl(x: number, a: number, b: number) {
    if (a > b) [a, b] = [b, a]
    return x >= a && x <= b
}

export function forceTrack(x: any, shallow = false) {
    switch (typeof x) {
        case "object":
            if (x !== null && !shallow) {
                entries(x).forEach((kv) => {
                    forceTrack(x[kv[0]])
                })
            }
            break
    }

    return true

    // https://github.com/sveltejs/svelte/issues/13547
    function entries(instance: Object) {
        return Object.entries(
            Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(instance)),
        )
            .filter(
                (e) => typeof e[1].get === "function" && e[0] !== "__proto__",
            )
            .map((e) => e)
            .concat(Object.entries(instance))
    }
}

export function clamp(x: number, a: number, b: number) {
    x = Math.max(x, a)
    x = Math.min(x, b)
    return x
}

export function newResizeObserver(el: HTMLElement, fn: () => void) {
    const obs = new ResizeObserver(fn)
    obs.observe(el)
    return () => obs.unobserve(el)
}

export function attachDoubleClickListener(
    fn: (ev1: MouseEvent, ev2: MouseEvent) => void,
    maxDelay = 500,
) {
    let lastClick = null as {
        time: number
        ev: MouseEvent
    } | null

    function wrapper(el: HTMLElement) {
        el.addEventListener("mousedown", onClick)

        return () => {
            el.removeEventListener("mousedown", onClick)
        }

        function onClick(ev: MouseEvent) {
            const update = { time: Date.now(), ev }

            if (lastClick) {
                const delay = update.time - lastClick.time
                if (delay <= maxDelay) {
                    fn(lastClick.ev, update.ev)
                    lastClick = null
                } else {
                    lastClick = update
                }
            } else {
                lastClick = update
            }
        }
    }

    return wrapper
}

export type Unsub = () => void

export function enumerate<T>(xs: T[]): Array<[number, T]> {
    return xs.map((x, i) => [i, x])
}

export function sort<T>(xs: T[], value: (x: T) => number, desc = false): T[] {
    return xs.slice().sort((a, b) => {
        const diff = value(a) - value(b)
        return desc ? -diff : diff
    })
}

export function alphabetical(xs: string[], desc = false): string[] {
    const mult = desc ? -1 : 1

    return xs.slice().sort((a, b) => {
        if (a < b) {
            return -1 * mult
        } else if (a == b) {
            return 0
        } else {
            return 1 * mult
        }
    })
}

export function alphabeticalBy<T>(
    xs: T[],
    getValue: (x: T) => string,
    desc = false,
): T[] {
    const mult = desc ? -1 : 1

    return xs.slice().sort((a, b) => {
        const va = getValue(a)
        const vb = getValue(b)

        if (va < vb) {
            return -1 * mult
        } else if (va == vb) {
            return 0
        } else {
            return 1 * mult
        }
    })
}

export function topK<T>(opts: {
    xs: T[]
    k: number
    value: (x: T) => number
    desc?: boolean
}): T[] {
    if (opts.k <= 0) return []

    if (opts.k >= opts.xs.length) {
        return sort(opts.xs, (x) => opts.value(x), !!opts.desc)
    }

    const candidates: T[] = []

    const isBefore = (a: T, b: T) =>
        opts.desc
            ? opts.value(a) < opts.value(b)
            : opts.value(a) > opts.value(b)

    for (const x of opts.xs) {
        if (candidates.length < opts.k) {
            insertSorted(candidates, x)
        } else {
            const worst = opts.desc
                ? candidates[0]
                : candidates[candidates.length - 1]
            if (isBefore(worst, x)) {
                insertSorted(candidates, x)
                opts.desc ? candidates.shift() : candidates.pop()
            }
        }
    }

    if (opts.desc) {
        candidates.reverse()
    }

    return candidates

    function insertSorted(ys: T[], y: T) {
        let st = 0
        let end = ys.length
        while (st < end) {
            const mid = Math.floor((st + end) / 2)
            if (y < ys[mid]) {
                end = mid
            } else {
                st = mid + 1
            }
        }

        ys.splice(st, 0, y)
    }
}

export type Guard<T, TOther = unknown> = (ctx: T | TOther) => ctx is T

export function groupBy<T, TKey>(
    xs: T[],
    getId: (x: T) => TKey,
): Map<TKey, T[]> {
    const groups: ReturnType<typeof groupBy<T, TKey>> = new Map()

    for (const x of xs) {
        const id = getId(x)

        if (!groups.has(id)) {
            groups.set(id, [])
        }

        groups.get(id)!.push(x)
    }

    return groups
}

export function sortByGroup<T, TKey = string>(
    xs: T[],
    getGroupKey: (x: T) => TKey,
    sortKeys: (ks: TKey[]) => TKey[],
    sortGroup: (k: TKey, xs: T[]) => T[],
): T[] {
    const groups = groupBy(xs, getGroupKey)
    const keys = sortKeys([...groups.keys()])
    const result = keys.flatMap((k) => sortGroup(k, groups.get(k)!))
    return result
}

export type InferMapKey<T extends Map<any, any>> =
    T extends Map<infer K, any> ? K : never
export type InferMapValue<T extends Map<any, any>> =
    T extends Map<any, infer V> ? V : never

type PoolId = number
export class IdPool {
    private nextId: PoolId = 0
    private holes: PoolId[] = [] // [0, nextId), no overlap with assigned
    private assigned: Set<PoolId> = new Set() // [0, nextId)

    register(externalId: PoolId) {
        if (externalId < 0) {
            throw new Error(String(externalId))
        }
        if (this.assigned.has(externalId)) {
            throw new Error(`dupe id ${externalId}`)
        }

        this.assigned.add(externalId)

        if (externalId >= this.nextId) {
            for (const id of range(this.nextId, externalId)) {
                this.holes.push(id)
            }

            this.nextId = externalId + 1
        }
    }
    registerAll(ids: Iterable<PoolId>): void {
        for (const id of ids) {
            this.register(id)
        }
    }

    acquire(): PoolId {
        let id: PoolId

        if (this.holes.length > 0) {
            id = this.holes.shift()!
        } else {
            id = this.nextId
            this.nextId += 1
        }

        this.assigned.add(id)

        return id
    }

    release(id: PoolId): void {
        if (!this.assigned.has(id)) {
            throw new Error()
        }

        this.holes.push(id)
        this.assigned.delete(id)
    }
    releaseAll(ids: Iterable<PoolId>): void {
        for (const id of ids) {
            this.release(id)
        }
    }
}

export type ValueOf<T> = T extends Record<infer K, infer V> ? V : T[keyof T]

export function shallowCopy<T = any>(x: T): T {
    // Primitive
    if (x === null || typeof x !== "object") {
        return x
    }

    // Array
    if (Array.isArray(x)) {
        return x.slice() as unknown as T
    }

    // Map
    if (x instanceof Map) {
        return new Map(x) as unknown as T
    }

    // Set
    if (x instanceof Set) {
        return new Set(x) as unknown as T
    }

    // Record
    const proto = Object.getPrototypeOf(x)
    if (proto === Object.prototype || proto === null) {
        return { ...(x as Record<PropertyKey, unknown>) } as T
    }

    // Class
    if (typeof x === "object") {
        return Object.assign(Object.create(proto), x)
    }

    throw new TypeError(`unsupported type ${Object.prototype.toString.call(x)}`)
}

export type Lens<T> = {
    get: () => T
    set: (update: T) => void
}

export type PropLens<T, K extends keyof T> = Lens<T[K]> & {
    parent: () => T
    delete: () => void
    replaceProp: <K2 extends keyof T>(
        prop2: K2,
        inplace: boolean,
    ) => PropLens<T, K2>
}

export function lens<T, K extends keyof T>(
    parent: T | (() => T),
    prop: K,
): PropLens<T, K> {
    let currProp = prop

    if (typeof parent === "function") {
        const _parent = parent as () => T
        return {
            parent: _parent,
            get: () => _parent()[currProp],
            set: (value) => {
                _parent()[currProp] = value
            },
            delete: () => delete _parent()[currProp],
            replaceProp<K2 extends keyof T>(prop2: K2, inplace = false) {
                if (inplace) {
                    currProp = prop2 as any
                    return this as unknown as PropLens<T, K2>
                } else {
                    return lens(_parent, prop2)
                }
            },
        }
    } else {
        return {
            parent: () => parent,
            get: () => parent[currProp],
            set: (value) => {
                parent[currProp] = value
            },
            delete: () => delete parent[currProp],
            replaceProp<K2 extends keyof T>(prop2: K2, inplace = false) {
                if (inplace) {
                    currProp = prop2 as any
                    return this as unknown as PropLens<T, K2>
                } else {
                    return lens(parent, prop2)
                }
            },
        }
    }
}

export function cn(...classes: Array<string | null | undefined>) {
    return classes.filter((cls) => cls !== null && cls !== undefined).join(" ")
}

export function on<T extends EventTarget, TK extends string>(
    target: T,
    eventName: TK,
    handler: TK extends keyof HTMLElementEventMap
        ? (event: HTMLElementEventMap[TK]) => void
        : EventListener,
): Unsub {
    target.addEventListener(eventName, handler)
    return () => target.removeEventListener(eventName, handler)
}

// export function composeLens<T, K1 extends keyof T, K2 extends keyof T[K1]>(
//     target: PropLens<T, K1>,
//     prop: K2,
// ): PropLens<T[K1], K2> {
//     return lens(target.get, prop)
// }

export function uuidWithFallback() {
    let randomUUID
    if (window?.crypto?.randomUUID !== undefined) {
        randomUUID = () => window.crypto.randomUUID()
    } else {
        const now = new Date().toISOString()
        const n = Math.random().toString()
        randomUUID = () => `${now}_${n}`
    }

    return randomUUID()
}

// prettier-ignore
export type InferGuardType<T> = 
    T extends (x: any) => x is infer V ? V : never

export type Or<A, B> = A extends never ? B : A

export function findNext<
    TItem,
    TCond extends (x: TItem, idx: number) => boolean = (x: TItem) => boolean,
>(
    xs: TItem[],
    cond: TCond,
    opts: {
        reverse?: boolean
        start?: number
        end?: number
        breakOn?: (x: TItem) => boolean
    } = {},
): [Or<InferGuardType<TCond>, TItem>, number] | [null, null] {
    const reverse = opts.reverse ?? false

    let start, end, step
    if (reverse) {
        start = opts.start ?? xs.length - 1
        end = opts.end ?? 0
        step = -1
    } else {
        start = opts.start ?? 0
        end = opts.end ?? xs.length - 1
        step = 1
    }

    for (let idx = start; reverse ? idx >= end : idx <= end; idx += step) {
        const x = xs[idx]

        if (cond(x, idx)) {
            return [x as any, idx]
        } else if (opts?.breakOn?.(x)) {
            return [null, null]
        }
    }

    return [null, null]
}

export interface SortByCriteria<TItem = any> {
    fn: (x: TItem) => number | string
    reverse?: boolean
}
export function sortBy<TItem = any>(
    xs: TItem[],
    criteria: SortByCriteria<TItem>[],
): TItem[] {
    const mapped = xs.map((x) => ({
        x,
        value: criteria.map((crit) => crit.fn(x)),
    }))

    const sorted = mapped.sort((a, b) => {
        for (const [aa, bb, crit] of zip(a.value, b.value, criteria)) {
            // prettier-ignore
            const diff =
                aa < bb ? -1 :
                aa > bb ? 1 :
                0
            if (diff === 0) {
                continue
            }

            const mult = crit.reverse ? -1 : 1
            return diff * mult
        }

        return 0
    })

    return sorted.map((x) => x.x)
}

export function zip<T extends unknown[][]>(
    ...arrs: T
): { [K in keyof T]: T[K] extends (infer U)[] ? U : never }[] {
    const { result, minLength, maxLength } = _zip(arrs)

    if (minLength !== maxLength) {
        throw new Error(
            `Cannot zip arrays of mismatched length when truncate=false (${minLength}~${maxLength})`,
        )
    }

    return result
}

export function zipLax<T extends unknown[][]>(
    ...arrs: T
): { [K in keyof T]: T[K] extends (infer U)[] ? U : never }[] {
    const { result } = _zip(arrs)
    return result
}

function _zip(arrs: any[][]) {
    if (!arrs.length) {
        throw new Error("Cannot zip empty array of arrays")
    }

    let minLength = arrs[0].length
    let maxLength = arrs[0].length
    for (const xs of arrs) {
        minLength = Math.min(minLength, xs.length)
        maxLength = Math.max(maxLength, xs.length)
    }

    if (minLength !== maxLength) {
        throw new Error(
            `Cannot zip arrays of mismatched length when truncate=false (${minLength}~${maxLength})`,
        )
    }

    const result = range(0, minLength - 1).map((idx) =>
        arrs.map((xs) => xs[idx]),
    ) as any

    return { result, minLength, maxLength }
}

export function formatNumber(x: number, alwaysShowSign?: boolean) {
    // prettier-ignore
    const sgn =
        x < 0 ? "-" :
        alwaysShowSign ? "+" :
        ""

    const digits = [...Math.trunc(Math.abs(x)).toString()]
        .reverse()
        .reduce((acc, digit, idx) => {
            if (idx % 3 === 0 && idx > 0) {
                acc.push(",")
            }

            acc.push(digit)

            return acc
        }, [] as string[])

    return sgn + digits.reverse().join("")
}

export function takeWhile<
    TItem,
    TCond extends (x: TItem, idx: number) => boolean = (x: TItem) => boolean,
>(
    xs: TItem[],
    cond: TCond,
    opts: {
        reverse?: boolean
        start?: number
        end?: number
    } = {},
): Array<Or<InferGuardType<TCond>, TItem>> {
    const reverse = opts.reverse ?? false

    let start, end, step
    if (reverse) {
        start = opts.start ?? xs.length - 1
        end = opts.end ?? 0
        step = -1
    } else {
        start = opts.start ?? 0
        end = opts.end ?? xs.length - 1
        step = 1
    }

    const items: any[] = []

    for (let idx = start; reverse ? idx >= end : idx <= end; idx += step) {
        const x = xs[idx]

        if (cond(x, idx)) {
            items.push(x)
        } else {
            break
        }
    }

    return items
}

export function setDefault<
    TKey extends string | number | symbol,
    TRecord extends Record<TKey, any>,
>(record: TRecord, key: TKey, value: TRecord[TKey]): TRecord[TKey] {
    record[key] = record[key] ?? value
    return record[key]
}

export function sum(xs: number[]) {
    return xs.reduce((acc, x) => acc + x, 0)
}

export function avg(xs: number[]) {
    if (xs.length === 0) {
        return 0
    }

    return sum(xs) / xs.length
}

export function indexes(xs: any[]): number[] {
    return [...range(xs.length - 1)]
}

export async function compressGzip(text: string): Promise<Array<Uint8Array>> {
    const asBytes = new TextEncoder().encode(text)
    const asStream = new ReadableStream({
        start(controller) {
            controller.enqueue(asBytes)
            controller.close()
        },
    })
        .pipeThrough(new CompressionStream("gzip"))
        .getReader()

    const asCompressed: Array<Uint8Array> = []
    while (true) {
        const { done, value } = (await asStream.read()) as {
            done: boolean
            value: Uint8Array
        }

        if (done) {
            break
        } else {
            asCompressed.push(value)
        }
    }

    return asCompressed
}

export async function decompressGzip(
    data: Array<Uint8Array> | Array<ArrayBuffer>,
): Promise<string> {
    const asStream = new ReadableStream({
        start(controller) {
            for (const arr of data) {
                controller.enqueue(arr)
            }
            controller.close()
        },
    })
        .pipeThrough(new DecompressionStream("gzip"))
        .getReader()

    let parts: string[] = []
    const decoder = new TextDecoder()
    while (true) {
        const { done, value } = (await asStream.read()) as {
            done: boolean
            value: Uint8Array
        }
        if (done) {
            break
        } else {
            parts.push(decoder.decode(value, { stream: true }))
        }
    }

    parts.push(decoder.decode())
    return parts.join("")
}

export async function consumeAsync<T = any>(
    iter: AsyncGenerator<T>,
): Promise<T[]> {
    const result: T[] = []
    for await (const x of iter) {
        result.push(x)
    }
    return result
}

export function concatArrays(xs: Uint8Array[]) {
    const totalSize = sum(xs.map((x) => x.length))
    const total = new Uint8Array(totalSize)

    let start = 0
    for (const arr of xs) {
        total.set(arr, start)
        start += arr.length
    }

    return total
}

export function last<T>(xs: T[]): T | undefined {
    return xs[xs.length - 1]
}

export function mapEntries<
    TOut extends Record<string, any> = Record<string, unknown>,
    TIn extends Record<string, any> | Map<string, any> = Record<
        string,
        unknown
    >,
>(
    x: TIn,
    mapping: TIn extends Map<infer K, infer V>
        ? (k: K, v: V) => Partial<TOut>
        : <K extends keyof TIn>(k: K, v: TIn[K]) => Partial<TOut>,
): TOut {
    const result = {} as TOut

    const entries = x instanceof Map ? [...x.entries()] : Object.entries(x)
    for (const entry of entries) {
        Object.assign(result, mapping(entry[0] as any, entry[1]))
    }
    return result
}
