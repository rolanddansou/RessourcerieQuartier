import { useEffect, useRef, type ReactNode } from 'react'

const paths = {
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  users:
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M15 3.13a4 4 0 0 1 0 7.75M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12 4 4L19 6',
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  refresh:
    'M20 7v5h-5M4 17v-5h5m-4-4a8 8 0 0 1 13-3l2 3M4 16l2 3a8 8 0 0 0 13-3',
  logout: 'M9 21H4V3h5m7 14 5-5-5-5m-9 5h14',
  leaf: 'M20 3C9 1 2 8 5 15c3 7 16 4 15-12ZM4 21 15 9',
  edit: 'm15 5 4 4M4 20l4-1L21 6l-4-4L4 15v5Z',
  trash: 'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
} as const

export function Icon({
  name,
  size = 18,
}: {
  name: keyof typeof paths
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function Notice({
  children,
  tone = 'error',
  action,
}: {
  children: ReactNode
  tone?: 'error' | 'success' | 'info'
  action?: ReactNode
}) {
  return (
    <div
      className={`notice notice-${tone}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span>{children}</span>
      {action}
    </div>
  )
}

export function Loading({
  children = 'Chargement de la semaine…',
}: {
  children?: ReactNode
}) {
  return (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      {children}
    </div>
  )
}

export function EmptyState({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name="calendar" size={26} />
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  )
}

export interface Confirmation {
  title: string
  description: string
  label: string
  destructive?: boolean
  confirm: () => void | Promise<void>
}

export function ConfirmDialog({
  value,
  busy,
  onClose,
}: {
  value: Confirmation | null
  busy: boolean
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (value && !dialog.current?.open) dialog.current?.showModal()
    if (!value && dialog.current?.open) dialog.current.close()
  }, [value])

  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirmation-title"
      aria-describedby="confirmation-description"
      onCancel={(event) => {
        event.preventDefault()
        if (!busy) onClose()
      }}
    >
      <h2 id="confirmation-title">{value?.title}</h2>
      <p id="confirmation-description">{value?.description}</p>
      <div className="actions dialog-actions">
        <button
          type="button"
          className="secondary"
          autoFocus
          disabled={busy}
          onClick={onClose}
        >
          Annuler
        </button>
        <button
          type="button"
          className={value?.destructive ? 'danger-solid' : ''}
          disabled={busy}
          onClick={() => void value?.confirm()}
        >
          {busy ? 'En cours…' : value?.label}
        </button>
      </div>
    </dialog>
  )
}
