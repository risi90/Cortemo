import { useState } from 'react'
import { Check, CircleDashed, PackageSearch, Truck, X } from 'lucide-react'
import { euro } from '../data/catalog'
import { supabase } from '../lib/supabase'
import { getOrders } from '../lib/adminStore'

type Status = {
  orderId: string
  date: string
  status: string
  paymentStatus: string
  total: number
  montage: boolean
  items: { name: string; qty: number }[]
}

/** Volgorde van de statusbalk; 'geannuleerd' valt erbuiten. */
const STEPS: { key: string; label: string; sub: string }[] = [
  { key: 'nieuw', label: 'Ontvangen', sub: 'Bestelling gecontroleerd en ingepland' },
  { key: 'in productie', label: 'In productie', sub: 'Lasersnijden, zetten en lassen in onze werkplaats' },
  { key: 'verzonden', label: 'Onderweg', sub: 'Pallettransport — de chauffeur belt vooraf' },
]

const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

export function OrderTracker() {
  const [order, setOrder] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<Status | null>(null)

  const lookup = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      if (supabase) {
        const { data, error: fnError } = await supabase.functions.invoke('order-status', {
          body: { order, email },
        })
        if (!fnError && data?.ok) {
          setResult(data as Status)
          setBusy(false)
          return
        }
        if (fnError && fnError.name === 'FunctionsHttpError') {
          const body = await (fnError as { context?: Response }).context?.json().catch(() => null)
          setError(body?.error ?? 'Opzoeken lukte niet, probeer het later opnieuw.')
          setBusy(false)
          return
        }
      }
      // offline/demo: lokale orders doorzoeken
      const local = getOrders().find(
        (o) =>
          o.id.toLowerCase() === order.trim().toLowerCase() &&
          o.email.toLowerCase() === email.trim().toLowerCase(),
      )
      if (local) {
        setResult({
          orderId: local.id,
          date: local.date,
          status: local.status,
          paymentStatus: local.paymentStatus ?? '',
          total: local.total,
          montage: false,
          items: local.items.map((i) => ({ name: i.name, qty: i.qty })),
        })
      } else {
        setError('Geen bestelling gevonden met deze combinatie van ordernummer en e-mailadres.')
      }
    } catch {
      setError('Opzoeken lukte niet, probeer het later opnieuw.')
    }
    setBusy(false)
  }

  const cancelled = result?.status === 'geannuleerd'
  const activeIdx = result ? Math.max(0, STEPS.findIndex((s) => s.key === result.status)) : 0

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
        Volg je bestelling
      </p>
      <h1 className="serif mt-3 text-[30px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px]">
        Waar is mijn staal?
      </h1>
      <p className="mt-3 max-w-md text-[14px] leading-relaxed text-white/60">
        Vul het ordernummer uit je bevestigingsmail en je e-mailadres in. Je ziet direct in welke
        fase je bestelling zit — van werkplaats tot bezorging.
      </p>

      <div className="liquid-glass mt-6 space-y-4 rounded-2xl p-6 text-white sm:p-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="mb-2 text-[13px] font-semibold">Ordernummer</div>
            <input
              type="text"
              placeholder="CM-123456"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void lookup()}
              aria-label="Ordernummer"
              className={field + ' uppercase'}
            />
          </div>
          <div>
            <div className="mb-2 text-[13px] font-semibold">E-mailadres</div>
            <input
              type="email"
              placeholder="naam@voorbeeld.nl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void lookup()}
              aria-label="E-mailadres van de bestelling"
              className={field}
            />
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-rust/10 px-3 py-2 text-[13px] font-medium text-rust" role="alert">
            {error}
          </p>
        )}
        <button
          onClick={() => void lookup()}
          disabled={busy}
          className="flex items-center gap-2 rounded-xl bg-rust px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep disabled:opacity-60"
        >
          <PackageSearch size={16} strokeWidth={2} /> {busy ? 'Zoeken…' : 'Toon status'}
        </button>
      </div>

      {result && (
        <div className="liquid-glass mt-4 rounded-2xl p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[16px] font-bold">Bestelling {result.orderId}</h2>
            <span className="text-[12px] text-white/50">
              geplaatst op {new Date(result.date).toLocaleDateString('nl-NL')}
            </span>
          </div>

          {cancelled ? (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-rust/10 px-4 py-3 text-[13px] font-semibold text-rust">
              <X size={15} strokeWidth={2} /> Deze bestelling is geannuleerd. Vragen? Mail
              hallo@cortemo.nl.
            </p>
          ) : (
            <ol className="mt-5 space-y-0">
              {STEPS.map((step, i) => {
                const done = i < activeIdx
                const current = i === activeIdx
                return (
                  <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {i < STEPS.length - 1 && (
                      <span
                        aria-hidden
                        className={
                          'absolute left-[13px] top-7 h-[calc(100%-20px)] w-0.5 rounded ' +
                          (done ? 'bg-ok' : 'bg-white/10')
                        }
                      />
                    )}
                    <span
                      className={
                        'z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ' +
                        (done
                          ? 'bg-ok text-white'
                          : current
                            ? 'bg-rust text-white'
                            : 'bg-white/10 text-white/40')
                      }
                    >
                      {done ? (
                        <Check size={14} strokeWidth={2.5} />
                      ) : current && step.key === 'verzonden' ? (
                        <Truck size={13} strokeWidth={2} />
                      ) : (
                        <CircleDashed size={13} strokeWidth={2} />
                      )}
                    </span>
                    <span>
                      <span
                        className={
                          'block text-[14px] font-bold ' + (done || current ? '' : 'text-white/45')
                        }
                      >
                        {step.label}
                      </span>
                      <span className="block text-[12px] leading-snug text-white/50">
                        {step.sub}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ol>
          )}

          <div className="mt-5 border-t border-white/10 pt-4">
            <ul className="space-y-1 text-[13px] text-white/70">
              {result.items.map((i, idx) => (
                <li key={idx}>
                  {i.qty} × {i.name}
                </li>
              ))}
            </ul>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[13px]">
              <span className="font-bold">Totaal {euro(result.total)}</span>
              {result.paymentStatus && (
                <span className="text-white/50">Betaling: {result.paymentStatus}</span>
              )}
            </div>
            {result.montage && (
              <p className="mt-2 text-[12px] text-white/50">
                Plaatsingsservice aangevraagd — we bellen je voor een afspraak.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
