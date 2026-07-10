import { useEffect, useState } from 'react'
import { Plus, Send, Trash2 } from 'lucide-react'
import { euro } from '../../data/catalog'
import {
  deleteOffer,
  fetchOffers,
  fetchQuotes,
  getOffers,
  getQuotes,
  offerTotal,
  saveOffer,
  saveOrder,
  sendOffer,
  setQuoteHandled,
  type Offer,
  type OfferLine,
  type OfferStatus,
} from '../../lib/adminStore'
import { Card, EmptyRow, fieldSm, fmtDate, PrimaryButton } from './ui'

const STATUS_STYLE: Record<OfferStatus, string> = {
  concept: 'bg-white/10 text-white/70',
  verzonden: 'bg-rust/20 text-rust',
  geaccepteerd: 'bg-ok/20 text-ok',
  afgewezen: 'bg-white/10 text-white/40 line-through',
}

export type OfferDraft = Partial<Pick<Offer, 'customer' | 'email' | 'lines' | 'note'>>

function Composer({
  draft,
  onSaved,
}: {
  draft: OfferDraft | null
  onSaved: () => void
}) {
  const [customer, setCustomer] = useState(draft?.customer ?? '')
  const [email, setEmail] = useState(draft?.email ?? '')
  const [lines, setLines] = useState<OfferLine[]>(draft?.lines ?? [{ descr: '', qty: 1, price: 0 }])
  const [discount, setDiscount] = useState(0)
  const [note, setNote] = useState(draft?.note ?? '')
  const [validUntil, setValidUntil] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!draft) return
    if (draft.customer !== undefined) setCustomer(draft.customer)
    if (draft.email !== undefined) setEmail(draft.email)
    if (draft.lines) setLines(draft.lines)
    if (draft.note !== undefined) setNote(draft.note)
  }, [draft])

  const total = offerTotal(lines, discount / 100)
  const validLines = lines.filter((l) => l.descr.trim() && l.price > 0)

  const build = (status: OfferStatus): Offer => ({
    id: 'OFF-' + String(Date.now()).slice(-6),
    date: new Date().toISOString(),
    customer,
    email,
    lines: validLines,
    discount: discount / 100,
    total,
    note,
    validUntil,
    status,
  })

  const validate = () => {
    if (customer.trim().length < 2 || !/\S+@\S+\.\S+/.test(email) || validLines.length === 0) {
      setError('Vul klant, geldig e-mailadres en minimaal één regel met prijs in.')
      return false
    }
    setError('')
    return true
  }

  const saveConcept = () => {
    if (!validate()) return
    saveOffer(build('concept'))
    onSaved()
  }

  const saveAndSend = async () => {
    if (!validate()) return
    setBusy(true)
    const offer = build('concept')
    saveOffer(offer)
    const result = await sendOffer(offer)
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Versturen mislukt; offerte staat als concept opgeslagen.')
      onSaved()
      return
    }
    onSaved()
  }

  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="text" placeholder="Klant / bedrijfsnaam" value={customer} onChange={(e) => setCustomer(e.target.value)} className={fieldSm + ' w-full'} />
        <input type="email" placeholder="E-mailadres" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldSm + ' w-full'} />
      </div>
      <div className="space-y-1.5">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              placeholder="Omschrijving (bijv. Keerwand op maat 2500 × 800 mm, 3 mm corten)"
              value={l.descr}
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, descr: e.target.value } : x)))}
              className={fieldSm + ' min-w-0 flex-1'}
            />
            <input
              type="number"
              min={1}
              value={l.qty}
              aria-label="Aantal"
              onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, qty: Math.max(1, +e.target.value) } : x)))}
              className={fieldSm + ' w-16 text-right tabular-nums'}
            />
            <span className="relative">
              <input
                type="number"
                min={0}
                step="0.01"
                value={l.price}
                aria-label="Stukprijs"
                onChange={(e) => setLines(lines.map((x, j) => (j === i ? { ...x, price: +e.target.value } : x)))}
                className={fieldSm + ' w-28 pl-6 text-right tabular-nums'}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-white/40">€</span>
            </span>
            <button
              onClick={() => setLines(lines.filter((_, j) => j !== i))}
              aria-label="Verwijder regel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setLines([...lines, { descr: '', qty: 1, price: 0 }])}
          className="flex items-center gap-1 text-[12px] font-semibold text-white/50 hover:text-white"
        >
          <Plus size={12} strokeWidth={2} /> regel toevoegen
        </button>
      </div>
      <textarea rows={2} placeholder="Notitie voor in de offertemail (optioneel)" value={note} onChange={(e) => setNote(e.target.value)} className={fieldSm + ' w-full resize-none'} />
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-white/70">
          Korting
          <input type="number" min={0} max={40} value={discount} onChange={(e) => setDiscount(+e.target.value)} className={fieldSm + ' w-16 text-right tabular-nums'} />
          %
        </label>
        <label className="flex items-center gap-2 text-[13px] text-white/70">
          Geldig tot
          <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} className={fieldSm} style={{ colorScheme: 'dark' }} />
        </label>
        <span className="ml-auto text-[16px] font-extrabold tabular-nums">{euro(total)}</span>
      </div>
      {error && <p className="text-[13px] font-medium text-rust">{error}</p>}
      <div className="flex gap-2">
        <PrimaryButton onClick={() => void saveAndSend()} disabled={busy}>
          <span className="flex items-center gap-2">
            <Send size={13} strokeWidth={2} /> {busy ? 'Bezig…' : 'Opslaan & versturen'}
          </span>
        </PrimaryButton>
        <button onClick={saveConcept} className="rounded-xl bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
          Opslaan als concept
        </button>
      </div>
    </div>
  )
}

export function OffersAdmin({ draft, onDraftUsed }: { draft: OfferDraft | null; onDraftUsed: () => void }) {
  const [tab, setTab] = useState<'offertes' | 'aanvragen'>(draft ? 'offertes' : 'offertes')
  const [offers, setOffers] = useState(getOffers)
  const [quotes, setQuotes] = useState(getQuotes)
  const [composing, setComposing] = useState(!!draft)
  const [sendErr, setSendErr] = useState('')
  const [converted, setConverted] = useState<Record<string, string>>({})

  // geaccepteerde offerte omzetten naar een order (regels 1-op-1 mee)
  const toOrder = (offer: Offer) => {
    const orderId = 'CM-' + String(Date.now()).slice(-6)
    saveOrder({
      id: orderId,
      date: new Date().toISOString(),
      name: offer.customer,
      email: offer.email,
      city: '',
      address: '',
      items: offer.lines.map((l, i) => ({
        key: offer.id + ':' + i,
        name: l.descr,
        qty: l.qty,
        unitPrice: l.price * (1 - offer.discount),
        config: [],
      })),
      total: offer.total,
      discountCode: offer.discount > 0 ? 'offerte ' + Math.round(offer.discount * 100) + '%' : '',
      discountAmount: Math.round(offer.lines.reduce((s, l) => s + l.price * l.qty, 0) * offer.discount * 100) / 100,
      status: 'nieuw',
    })
    setConverted((s) => ({ ...s, [offer.id]: orderId }))
  }

  useEffect(() => {
    void fetchOffers().then(setOffers)
    void fetchQuotes().then(setQuotes)
  }, [])
  useEffect(() => {
    if (draft) {
      setTab('offertes')
      setComposing(true)
    }
  }, [draft])

  // optimistisch: eerst de lokale cache tonen, daarna stil met de database
  // verzoenen zodat een trage verbinding de lijst nooit blokkeert
  const refresh = () => {
    setComposing(false)
    onDraftUsed()
    setOffers(getOffers())
    void fetchOffers().then(setOffers).catch(() => {})
  }

  const send = async (offer: Offer) => {
    setSendErr('')
    const result = await sendOffer(offer)
    if (!result.ok) setSendErr(result.error || 'Versturen mislukt.')
    setOffers(getOffers())
    void fetchOffers().then(setOffers).catch(() => {})
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 rounded-xl bg-white/5 p-1">
        {(
          [
            ['offertes', 'Offertes (uitgaand)'],
            ['aanvragen', 'Aanvragen (inkomend)'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              'flex-1 rounded-lg py-2 text-[13px] font-semibold transition-all ' +
              (tab === id ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white')
            }
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'offertes' && (
        <Card
          title="Offertes"
          aside={
            !composing ? (
              <button
                onClick={() => setComposing(true)}
                className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep"
              >
                <Plus size={13} strokeWidth={2} /> Nieuwe offerte
              </button>
            ) : undefined
          }
        >
          {composing && (
            <div className="mb-4">
              <Composer draft={draft} onSaved={refresh} />
            </div>
          )}
          {sendErr && <p className="mb-3 text-[13px] font-medium text-rust">{sendErr}</p>}
          {offers.length === 0 ? (
            <EmptyRow>Nog geen offertes. Maak er een via de knop hierboven of vanuit een calculatie.</EmptyRow>
          ) : (
            <ul className="divide-y divide-white/5">
              {offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-3 py-3.5">
                  <span className="text-[13px] font-bold">{o.id}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold">{o.customer}</span>
                    <span className="block truncate text-[11px] text-white/45">
                      {o.email} · {fmtDate(o.date)} · {o.lines.length} regel{o.lines.length === 1 ? '' : 's'}
                    </span>
                  </span>
                  <span className="text-[13px] font-bold tabular-nums">{euro(o.total)}</span>
                  <span className={'rounded-full px-2.5 py-1 text-[11px] font-semibold ' + STATUS_STYLE[o.status]}>
                    {o.status}
                  </span>
                  {o.status === 'concept' && (
                    <button
                      onClick={() => void send(o)}
                      className="flex items-center gap-1.5 rounded-lg bg-rust px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-rust-deep"
                    >
                      <Send size={12} strokeWidth={2} /> Verstuur
                    </button>
                  )}
                  {o.status === 'verzonden' && (
                    <button
                      onClick={() => {
                        saveOffer({ ...o, status: 'geaccepteerd' })
                        setOffers(getOffers())
                      }}
                      className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
                    >
                      Markeer geaccepteerd
                    </button>
                  )}
                  {o.status === 'geaccepteerd' &&
                    (converted[o.id] ? (
                      <span className="text-[12px] font-semibold text-ok">
                        → order {converted[o.id]}
                      </span>
                    ) : (
                      <button
                        onClick={() => toOrder(o)}
                        className="rounded-lg bg-ok px-2.5 py-1.5 text-[12px] font-semibold text-white hover:brightness-110"
                      >
                        Zet om naar order
                      </button>
                    ))}
                  <button
                    onClick={() => setOffers(deleteOffer(o.id))}
                    aria-label={'Verwijder ' + o.id}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-rust"
                  >
                    <Trash2 size={13} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'aanvragen' && (
        <Card title="Offerte-aanvragen (webshop)" aside={<span className="text-[12px] text-white/40">{quotes.length} totaal</span>}>
          {quotes.length === 0 ? (
            <EmptyRow>Nog geen aanvragen vanuit het maatwerkformulier.</EmptyRow>
          ) : (
            <ul className="divide-y divide-white/5">
              {quotes.map((q) => (
                <li key={q.id} className="flex flex-wrap items-center gap-3 py-4">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">
                      {q.type} {q.dims && <span className="text-white/50">· {q.dims}</span>}
                    </span>
                    <span className="block truncate text-[11px] text-white/45">
                      {q.name} · {q.email} · {fmtDate(q.date)}
                      {q.note && ' · ' + q.note}
                    </span>
                  </span>
                  <button
                    onClick={() => setQuotes(setQuoteHandled(q.id, !q.handled))}
                    className={
                      'shrink-0 rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ' +
                      (q.handled ? 'bg-ok/20 text-ok' : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white')
                    }
                  >
                    {q.handled ? 'Afgehandeld' : 'Markeer afgehandeld'}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  )
}
