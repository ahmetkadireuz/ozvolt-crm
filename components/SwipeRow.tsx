'use client'

import { useRef, useState, type ReactNode } from 'react'

export type SwipeAction = {
  label: string
  icon: ReactNode
  color: string
  onAction: () => void | Promise<void>
}

type Props = {
  children: ReactNode
  leftActions?: SwipeAction[]   // revealed by swiping right
  rightActions?: SwipeAction[]  // revealed by swiping left
  onClick?: () => void
  className?: string
}

const REVEAL = 84  // px per action
const SNAP_THRESHOLD = 40
const COMMIT_THRESHOLD = 0.6  // fraction of full reveal

export default function SwipeRow({ children, leftActions = [], rightActions = [], onClick, className }: Props) {
  const [offset, setOffset] = useState(0)
  const startX = useRef(0)
  const startY = useRef(0)
  const dragging = useRef(false)
  const lockedAxis = useRef<'x' | 'y' | null>(null)
  const baseOffset = useRef(0)

  const leftWidth = leftActions.length * REVEAL
  const rightWidth = rightActions.length * REVEAL

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    startX.current = t.clientX
    startY.current = t.clientY
    baseOffset.current = offset
    dragging.current = true
    lockedAxis.current = null
  }

  function onTouchMove(e: React.TouchEvent) {
    if (!dragging.current) return
    const t = e.touches[0]
    const dx = t.clientX - startX.current
    const dy = t.clientY - startY.current
    if (!lockedAxis.current) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      } else return
    }
    if (lockedAxis.current !== 'x') return
    let next = baseOffset.current + dx
    if (next > leftWidth) next = leftWidth + (next - leftWidth) * 0.25
    if (next < -rightWidth) next = -rightWidth + (next + rightWidth) * 0.25
    setOffset(next)
  }

  function onTouchEnd() {
    dragging.current = false
    if (lockedAxis.current !== 'x') {
      lockedAxis.current = null
      return
    }
    lockedAxis.current = null
    if (offset > leftWidth * COMMIT_THRESHOLD && leftActions.length) {
      setOffset(leftWidth)
    } else if (offset < -rightWidth * COMMIT_THRESHOLD && rightActions.length) {
      setOffset(-rightWidth)
    } else if (Math.abs(offset) < SNAP_THRESHOLD) {
      setOffset(0)
    } else {
      setOffset(0)
    }
  }

  function handleClick(e: React.MouseEvent) {
    if (offset !== 0) {
      setOffset(0)
      e.preventDefault()
      e.stopPropagation()
      return
    }
    onClick?.()
  }

  async function runAction(a: SwipeAction) {
    setOffset(0)
    await a.onAction()
  }

  return (
    <div className={`swipe-row ${className ?? ''}`}>
      {leftActions.length > 0 && (
        <div className="swipe-actions swipe-actions-left" style={{ width: leftWidth }}>
          {leftActions.map((a, i) => (
            <button
              key={i}
              type="button"
              className="swipe-action"
              style={{ background: a.color, width: REVEAL }}
              onClick={() => runAction(a)}
              aria-label={a.label}
            >
              <span className="swipe-action-ico">{a.icon}</span>
              <span className="swipe-action-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      {rightActions.length > 0 && (
        <div className="swipe-actions swipe-actions-right" style={{ width: rightWidth }}>
          {rightActions.map((a, i) => (
            <button
              key={i}
              type="button"
              className="swipe-action"
              style={{ background: a.color, width: REVEAL }}
              onClick={() => runAction(a)}
              aria-label={a.label}
            >
              <span className="swipe-action-ico">{a.icon}</span>
              <span className="swipe-action-label">{a.label}</span>
            </button>
          ))}
        </div>
      )}
      <div
        className="swipe-row-body"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        style={{ transform: `translate3d(${offset}px,0,0)`, transition: dragging.current ? 'none' : 'transform .2s' }}
      >
        {children}
      </div>
    </div>
  )
}
