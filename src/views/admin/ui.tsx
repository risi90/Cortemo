/** Gedeelde bouwstenen voor de admin-secties. */

export const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

export const fieldSm =
  'rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-[13px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust'

export const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

export function Card({
  title,
  children,
  aside,
}: {
  title?: string
  children: React.ReactNode
  aside?: React.ReactNode
}) {
  return (
    <div className="liquid-glass rounded-2xl p-5 text-white sm:p-6">
      {(title || aside) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && <h2 className="text-[15px] font-bold">{title}</h2>}
          {aside}
        </div>
      )}
      {children}
    </div>
  )
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 text-white">
      <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

export function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-white/40">{children}</p>
}

export function PrimaryButton({
  onClick,
  children,
  ok,
  disabled,
}: {
  onClick: () => void
  children: React.ReactNode
  ok?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={
        'rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition-all disabled:opacity-50 ' +
        (ok ? 'bg-ok' : 'bg-rust hover:bg-rust-deep')
      }
    >
      {children}
    </button>
  )
}
