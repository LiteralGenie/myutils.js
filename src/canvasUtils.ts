import { on, range, sort, type Guard, type Unsub } from './miscUtils'

export type Point2 = [number, number]

export type MiniMouseEvent = Pick<
    MouseEvent,
    'button' | 'clientX' | 'clientY' | 'offsetX' | 'offsetY'
>
export type SaneExclude<TCtx, TCancel> =
    Exclude<TCtx, TCancel> extends never
        ? TCtx
        : Exclude<TCtx, TCancel>

export interface ListenDragOptions<TCtx, TCancel> {
    el: HTMLElement
    onStart: (ev: MiniMouseEvent) => TCtx | TCancel
    onMove: (
        ev: MiniMouseEvent,
        ctx: SaneExclude<TCtx, TCancel>,
    ) => SaneExclude<TCtx, TCancel>
    onEnd: (
        ev: MiniMouseEvent,
        ctx: SaneExclude<TCtx, TCancel>,
    ) => void
    startGuard?: Guard<TCancel, TCtx>
    disableSelect?: boolean
}

export function listenDrag<TCancel = never, TCtx = unknown>(
    opts: ListenDragOptions<TCtx, TCancel>,
): [Unsub, () => void, () => void] {
    let currOnEnd = (ev: MiniMouseEvent) => {}
    const onMouseDown = (ev: MiniMouseEvent) => {
        const dragCtx = opts.onStart(ev) as SaneExclude<TCtx, TCancel>

        if (opts.disableSelect) {
            document.body.classList.add('no-select')
        }

        const guard = opts.startGuard
            ? opts.startGuard
            : (((x) => false) as Guard<TCancel, TCtx>)
        if (guard(dragCtx)) {
            return
        }

        const onMove = (ev: MiniMouseEvent) => {
            opts.onMove(ev, dragCtx)
        }

        const onEnd = (ev: MiniMouseEvent) => {
            document.body.classList.remove('no-select')

            opts.onEnd(ev, dragCtx)

            unsubMousemove()
            unsubMouseup()

            currOnEnd = () => {}
        }
        currOnEnd = onEnd

        const unsubMousemove = on(window, 'mousemove', onMove)
        const unsubMouseup = on(window, 'mouseup', onEnd)
    }

    let lastMove: MiniMouseEvent = {
        button: 0,
        clientX: 0,
        clientY: 0,
        offsetX: 0,
        offsetY: 0,
    }
    const onMouseMove = (ev: MiniMouseEvent) => {
        lastMove = ev
    }

    const unsubMousedown = on(opts.el, 'mousedown', onMouseDown)
    const unsubMousemove = on(opts.el, 'mousemove', onMouseMove)

    const forceStart = () => {
        onMouseDown(lastMove)
    }
    const forceEnd = () => {
        currOnEnd(lastMove)
    }

    return [
        () => {
            unsubMousedown()
            unsubMousemove()
        },
        forceStart,
        forceEnd,
    ]
}

export interface DragPositionContext {
    start: Point2
    end: Point2
    startRelative: Point2
    endRelative: Point2
    offset: Point2
}

export type ListenPositionDragOptions<TCtx, TCancel> = {
    el: HTMLElement
    startGuard?: Guard<TCancel>
    onStart: (
        ev: MiniMouseEvent,
        pos: DragPositionContext,
    ) => TCtx | TCancel
    onMove: (
        ev: MiniMouseEvent,
        pos: DragPositionContext,
        ctx: SaneExclude<TCtx, TCancel>,
    ) => SaneExclude<TCtx, TCancel>
    onEnd: (
        ev: MiniMouseEvent,
        pos: DragPositionContext,
        ctx: SaneExclude<TCtx, TCancel>,
    ) => void
    disableSelect?: boolean
}

const cancelPositionDrag = Symbol()
type CancelPositionDrag = typeof cancelPositionDrag

type PositionCtx<TCtx> = {
    pos: DragPositionContext
    extras: TCtx
}
export function listenPositionDrag<TCancel = never, TCtx = unknown>(
    opts: ListenPositionDragOptions<TCtx, TCancel>,
) {
    return listenDrag<CancelPositionDrag, PositionCtx<TCtx>>({
        ...opts,
        onStart: (ev) => {
            const pos = {
                start: [ev.clientX, ev.clientY] as Point2,
                end: [ev.clientX, ev.clientY] as Point2,
                startRelative: [ev.offsetX, ev.offsetY] as Point2,
                get endRelative() {
                    return add2(this.startRelative, this.offset)
                },
                get offset() {
                    return sub2(this.end, this.start)
                },
            }

            const ctx = opts.onStart(ev, pos)

            if (opts.startGuard && opts.startGuard(ctx)) {
                return cancelPositionDrag
            }

            return {
                pos,
                extras: ctx,
            } as PositionCtx<TCtx>
        },
        onMove: (ev, ctx) => {
            ctx.pos.end = [ev.clientX, ev.clientY]
            ctx.extras = opts.onMove(ev, ctx.pos, ctx.extras as any)
            return ctx
        },
        onEnd: (ev, ctx) => {
            opts.onEnd(ev, ctx.pos, ctx.extras as any)
            return
        },
        startGuard: ((ctx) => {
            return ctx === cancelPositionDrag
        }) as Guard<CancelPositionDrag>,
    })
}

// https://stackoverflow.com/questions/41139763/how-to-declare-a-fixed-length-array-in-typescript
type Tuple<N extends number, T = any> = GrowToSize<T, N, []>
type GrowToSize<
    T,
    N extends number,
    A extends T[],
> = A['length'] extends N ? A : GrowToSize<T, N, [...A, T]>
type TupleLength<T = any> = T extends { length: infer N } ? N : never

export function map2<const T extends Readonly<Point2>[]>(
    pts: T,
    fn: (...vs: Tuple<TupleLength<T>, number>) => number,
): Point2 {
    const n = 2
    return range(n).map((i) => {
        const args = pts.map((pt) => pt[i]) as Tuple<
            TupleLength<T>,
            number
        >
        return fn(...args)
    }) as Point2
}

export function add2(
    a: Readonly<Point2>,
    b: Readonly<Point2>,
): Point2 {
    return map2([a, b], (a, b) => a + b)
}
export function sub2(
    a: Readonly<Point2>,
    b: Readonly<Point2>,
): Point2 {
    return map2([a, b], (a, b) => a - b)
}
export function mult2(
    a: Readonly<Point2>,
    b: Readonly<Point2>,
): Point2 {
    return map2([a, b], (a, b) => a * b)
}
export function div2(
    a: Readonly<Point2>,
    b: Readonly<Point2>,
): Point2 {
    return map2([a, b], (a, b) => a / b)
}
export function round2(pt: Point2): Point2 {
    return pt.map((u) => Math.round(u)) as Point2
}
export function sumPt(pt: Point2) {
    return pt[0] + pt[1]
}

export function drawLine(opts: {
    ctx: OffscreenCanvasRenderingContext2D
    p0: Point2
    p1: Point2
    stroke?: {
        color?: string
        opacity?: number
        width?: number
    }
    fill?: {
        color?: string
        opacity?: string
        width?: number
    }
}) {
    const ctx = opts.ctx
    const {
        stroke: {
            color: sc = '#ffffff',
            opacity: so = 'ff',
            width: sw = 3,
        } = {},
    } = opts
    const {
        fill: {
            color: fc = '#ffffff',
            opacity: fo = 'ff',
            width: fw = 3,
        } = {},
    } = opts

    ctx.beginPath()

    ctx.strokeStyle = sc + so
    ctx.lineWidth = sw + fw
    ctx.moveTo(...opts.p0)
    ctx.lineTo(...opts.p1)
    ctx.stroke()

    ctx.strokeStyle = fc + fo
    ctx.lineWidth = fw
    ctx.stroke()

    ctx.closePath()
}

export function getCanvasCtx<
    T extends HTMLCanvasElement | OffscreenCanvas,
>(
    canvasEl: T,
    opts?: {
        clear?: boolean
    },
): T extends HTMLCanvasElement
    ? CanvasRenderingContext2D
    : OffscreenCanvasRenderingContext2D {
    const ctx = canvasEl.getContext('2d')! as ReturnType<
        typeof getCanvasCtx
    >

    ctx.imageSmoothingEnabled = false

    if (opts?.clear) {
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height)
    }

    return ctx as any
}

export function checkOverlap(
    a: {
        p0: Point2
    } & (
        | {
              p1: Point2
          }
        | { wh: Point2 }
    ),
    b: typeof a,
): boolean {
    const a0 = a.p0
    const a1 = 'p1' in a ? a.p1 : add2(a0, a.wh)
    const b0 = b.p0
    const b1 = 'p1' in b ? b.p1 : add2(b0, b.wh)

    const [ax0, ax1] = sort([a0[0], a1[0]], (u) => u)
    const [ay0, ay1] = sort([a0[1], a1[1]], (u) => u)
    const [bx0, bx1] = sort([b0[0], b1[0]], (u) => u)
    const [by0, by1] = sort([b0[1], b1[1]], (u) => u)

    return (
        true && ax0 <= bx1 && ax1 >= bx0 && ay0 <= by1 && ay1 >= by0
    )
}
