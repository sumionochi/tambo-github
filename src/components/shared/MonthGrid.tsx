// components/shared/MonthGrid.tsx
// Shared month calendar grid — used by Calendar (tab) and CalendarInline (chat)
// Full mode: tall cells with event pills, delete buttons, click-to-filter
// Compact mode: shorter cells with event dots for inline chat rendering
'use client'

import { useMemo, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  datetime: string
  note?: string
  completed?: boolean
  linkedItems?: any[]
}

interface MonthGridProps {
  events: CalEvent[]
  /** Compact mode for inline chat — shorter cells, dots instead of pills */
  compact?: boolean
  /** Called when a day cell is clicked */
  onDayClick?: (date: Date) => void
  /** Currently selected day (highlighted) */
  selectedDate?: Date | null
  /** Called when an event pill's X is clicked */
  onDeleteEvent?: (eventId: string, eventTitle: string) => void
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const WEEKDAYS_SHORT = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

// Rotating event pill colors (sage/warm palette)
const PILL_COLORS = [
  { bg: 'rgba(91,143,91,0.15)', text: '#3D643D', border: 'rgba(91,143,91,0.25)' },   // sage
  { bg: 'rgba(139,115,85,0.13)', text: '#6B5B45', border: 'rgba(139,115,85,0.22)' },  // warm brown
  { bg: 'rgba(143,91,91,0.12)', text: '#7A4A4A', border: 'rgba(143,91,91,0.20)' },    // muted rose
  { bg: 'rgba(91,120,143,0.13)', text: '#4A5F7A', border: 'rgba(91,120,143,0.22)' },  // dusty blue
  { bg: 'rgba(143,130,91,0.13)', text: '#7A6B3D', border: 'rgba(143,130,91,0.22)' },  // gold
]

export function MonthGrid({ events, compact = false, onDayClick, selectedDate, onDeleteEvent }: MonthGridProps) {
  const [viewDate, setViewDate] = useState(() => new Date())

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()

  const navigate = useCallback((delta: number) => {
    setViewDate(prev => {
      const d = new Date(prev)
      d.setMonth(d.getMonth() + delta)
      return d
    })
  }, [])

  const goToday = useCallback(() => setViewDate(new Date()), [])

  // Build calendar grid cells + index events by date
  const { cells, eventsByDate } = useMemo(() => {
    const firstDay = new Date(year, month, 1)
    let startDow = firstDay.getDay() - 1 // Mon=0
    if (startDow < 0) startDow = 6        // Sun → 6

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevMonthDays = new Date(year, month, 0).getDate()

    const grid: Array<{ date: number; inMonth: boolean; dateObj: Date }> = []

    // Previous month padding
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthDays - i
      grid.push({ date: d, inMonth: false, dateObj: new Date(year, month - 1, d) })
    }
    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push({ date: d, inMonth: true, dateObj: new Date(year, month, d) })
    }
    // Next month padding (fill to complete rows)
    const targetLen = grid.length > 35 ? 42 : 35
    let nextDay = 1
    while (grid.length < targetLen) {
      grid.push({ date: nextDay, inMonth: false, dateObj: new Date(year, month + 1, nextDay) })
      nextDay++
    }

    // Index events by date key
    const map: Record<string, CalEvent[]> = {}
    for (const ev of events) {
      if (!ev.datetime) continue
      const d = new Date(ev.datetime)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!map[key]) map[key] = []
      map[key].push(ev)
    }

    return { cells: grid, eventsByDate: map }
  }, [year, month, events])

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
  const selectedKey = selectedDate
    ? `${selectedDate.getFullYear()}-${selectedDate.getMonth()}-${selectedDate.getDate()}`
    : null

  const monthLabel = viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'var(--fs-cream-50)',
        border: '1px solid var(--fs-border-light)',
      }}>

      {/* ── Month Header ── */}
      <div className={`flex items-center justify-between ${compact ? 'px-3 py-2.5' : 'px-5 py-3.5'}`}
        style={{ borderBottom: '1px solid var(--fs-cream-200)' }}>
        <h3 className={`font-bold tracking-tight ${compact ? 'text-sm' : 'text-lg'}`}
          style={{
            color: 'var(--fs-text-primary)',
            fontFamily: compact ? 'inherit' : "'Fraunces', serif",
          }}>
          {monthLabel}
        </h3>
        <div className="flex items-center gap-1">
          <NavBtn onClick={() => navigate(-1)} compact={compact}>
            <ChevronLeft size={compact ? 14 : 16} strokeWidth={2} />
          </NavBtn>
          <button onClick={goToday}
            className={`font-semibold rounded-lg transition-all ${compact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'}`}
            style={{
              background: 'var(--fs-cream-200)',
              color: 'var(--fs-text-secondary)',
              transitionDuration: 'var(--fs-duration-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--fs-sage-100)'
              e.currentTarget.style.color = 'var(--fs-sage-700)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--fs-cream-200)'
              e.currentTarget.style.color = 'var(--fs-text-secondary)'
            }}>
            Today
          </button>
          <NavBtn onClick={() => navigate(1)} compact={compact}>
            <ChevronRight size={compact ? 14 : 16} strokeWidth={2} />
          </NavBtn>
        </div>
      </div>

      {/* ── Weekday Headers ── */}
      <div className="grid grid-cols-7" style={{ borderBottom: '1px solid var(--fs-cream-200)' }}>
        {(compact ? WEEKDAYS_SHORT : WEEKDAYS).map((day, i) => (
          <div key={i}
            className={`text-center font-semibold uppercase tracking-wider ${compact ? 'text-[9px] py-1.5' : 'text-[10px] py-2.5'}`}
            style={{
              color: 'var(--fs-text-muted)',
              ...(i < 6 ? { borderRight: '1px solid var(--fs-cream-200)' } : {}),
            }}>
            {day}
          </div>
        ))}
      </div>

      {/* ── Day Grid ── */}
      <div className="grid grid-cols-7">
        {cells.map((cell, i) => {
          const dateKey = `${cell.dateObj.getFullYear()}-${cell.dateObj.getMonth()}-${cell.dateObj.getDate()}`
          const dayEvents = eventsByDate[dateKey] || []
          const isToday = dateKey === todayKey && cell.inMonth
          const isSelected = dateKey === selectedKey && cell.inMonth
          const hasEvents = dayEvents.length > 0 && cell.inMonth
          const row = Math.floor(i / 7)
          const col = i % 7
          const totalRows = Math.ceil(cells.length / 7)

          return (
            <div key={i}
              onClick={() => cell.inMonth && onDayClick?.(cell.dateObj)}
              className={`
                relative transition-colors group/cell
                ${cell.inMonth ? 'cursor-pointer' : ''}
                ${compact ? 'min-h-9' : 'min-h-[88px]'}
              `}
              style={{
                background: isSelected
                  ? 'var(--fs-sage-50)'
                  : cell.inMonth
                    ? 'var(--fs-cream-50)'
                    : 'var(--fs-cream-100)',
                transitionDuration: 'var(--fs-duration-fast)',
                // Grid borders
                ...(col < 6 ? { borderRight: '1px solid var(--fs-cream-200)' } : {}),
                ...(row < totalRows - 1 ? { borderBottom: '1px solid var(--fs-cream-200)' } : {}),
                // Dim out-of-month cells
                ...(!cell.inMonth ? { opacity: 0.35 } : {}),
              }}
              onMouseEnter={e => {
                if (cell.inMonth && !isSelected) e.currentTarget.style.background = 'var(--fs-cream-100)'
              }}
              onMouseLeave={e => {
                if (cell.inMonth && !isSelected) e.currentTarget.style.background = 'var(--fs-cream-50)'
              }}>

              {/* Day number */}
              <div className={`${compact ? 'p-1' : 'p-1.5'}`}>
                <div className={`
                  ${compact ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs'}
                  flex items-center justify-center rounded-full font-semibold leading-none
                `}
                  style={{
                    background: isToday ? 'var(--fs-sage-600)' : 'transparent',
                    color: isToday
                      ? 'white'
                      : isSelected
                        ? 'var(--fs-sage-700)'
                        : cell.inMonth
                          ? 'var(--fs-text-primary)'
                          : 'var(--fs-text-muted)',
                  }}>
                  {cell.date}
                </div>
              </div>

              {/* ─── Event indicators ─── */}
              {compact ? (
                /* Compact mode: colored dots */
                hasEvents && (
                  <div className="flex gap-[3px] justify-center pb-1">
                    {dayEvents.slice(0, 3).map((ev, j) => (
                      <div key={j} className="w-[5px] h-[5px] rounded-full"
                        style={{
                          background: ev.completed
                            ? 'var(--fs-text-muted)'
                            : PILL_COLORS[j % PILL_COLORS.length].text,
                        }} />
                    ))}
                    {dayEvents.length > 3 && (
                      <span className="text-[7px] font-bold leading-none"
                        style={{ color: 'var(--fs-text-muted)' }}>
                        +{dayEvents.length - 3}
                      </span>
                    )}
                  </div>
                )
              ) : (
                /* Full mode: event pills with labels & delete */
                hasEvents && (
                  <div className="px-1 pb-1.5 space-y-[3px] -mt-0.5">
                    {dayEvents.slice(0, 2).map((ev, j) => {
                      const color = ev.completed
                        ? { bg: 'var(--fs-cream-200)', text: 'var(--fs-text-muted)', border: 'var(--fs-cream-300)' }
                        : PILL_COLORS[j % PILL_COLORS.length]
                      return (
                        <div key={j}
                          className="group/pill relative flex items-center rounded-md transition-all"
                          style={{
                            background: color.bg,
                            border: `1px solid ${color.border}`,
                            transitionDuration: 'var(--fs-duration-fast)',
                          }}>
                          <span
                            className="text-[10px] font-medium leading-tight px-1.5 py-[3px] truncate flex-1 min-w-0"
                            style={{
                              color: color.text,
                              textDecoration: ev.completed ? 'line-through' : 'none',
                            }}>
                            {ev.title || 'Event'}
                          </span>
                          {/* Delete X — shown on hover */}
                          {onDeleteEvent && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onDeleteEvent(ev.id, ev.title) }}
                              className="opacity-0 group-hover/pill:opacity-100 shrink-0 p-0.5 mr-0.5 rounded transition-all"
                              style={{
                                color: color.text,
                                transitionDuration: 'var(--fs-duration-fast)',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                              title={`Delete "${ev.title}"`}>
                              <X size={10} strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-bold px-1.5 block"
                        style={{ color: 'var(--fs-text-muted)' }}>
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Navigation Button ───
function NavBtn({ onClick, compact, children }: { onClick: () => void; compact?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`${compact ? 'p-1' : 'p-1.5'} rounded-lg transition-all`}
      style={{ color: 'var(--fs-text-muted)', transitionDuration: 'var(--fs-duration-fast)' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'var(--fs-cream-200)'
        e.currentTarget.style.color = 'var(--fs-text-primary)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent'
        e.currentTarget.style.color = 'var(--fs-text-muted)'
      }}>
      {children}
    </button>
  )
}