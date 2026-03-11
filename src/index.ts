// radash range(1, 0) yields [0] instead of []
// https://github.com/sodiray/radash/pull/463
export function range(
    a: number,
    b?: number,
    step?: number,
): number[] {
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

export function createRng(seed = '') {
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

export type Fn<TArgs extends Array<any>, TReturn> = (
    ...args: TArgs
) => TReturn

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
        case 'object':
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
            Object.getOwnPropertyDescriptors(
                Reflect.getPrototypeOf(instance),
            ),
        )
            .filter(
                (e) =>
                    typeof e[1].get === 'function' &&
                    e[0] !== '__proto__',
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
        el.addEventListener('mousedown', onClick)

        return () => {
            el.removeEventListener('mousedown', onClick)
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

export function sort<T>(
    xs: T[],
    value: (x: T) => number,
    desc = false,
): T[] {
    return xs.slice().sort((a, b) => {
        const diff = value(a) - value(b)
        return desc ? -diff : diff
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

export type ValueOf<T> =
    T extends Record<infer K, infer V> ? V : T[keyof T]

export function shallowCopy<T = any>(x: T): T {
    // Primitive
    if (x === null || typeof x !== 'object') {
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
    if (typeof x === 'object') {
        return Object.assign(Object.create(proto), x)
    }

    throw new TypeError(
        `unsupported type ${Object.prototype.toString.call(x)}`,
    )
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

    if (typeof parent === 'function') {
        const _parent = parent as () => T
        return {
            parent: _parent,
            get: () => _parent()[currProp],
            set: (value) => {
                _parent()[currProp] = value
            },
            delete: () => delete _parent()[currProp],
            replaceProp<K2 extends keyof T>(
                prop2: K2,
                inplace = false,
            ) {
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
            replaceProp<K2 extends keyof T>(
                prop2: K2,
                inplace = false,
            ) {
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
    return classes
        .filter((cls) => cls !== null && cls !== undefined)
        .join(' ')
}

// export function composeLens<T, K1 extends keyof T, K2 extends keyof T[K1]>(
//     target: PropLens<T, K1>,
//     prop: K2,
// ): PropLens<T[K1], K2> {
//     return lens(target.get, prop)
// }
