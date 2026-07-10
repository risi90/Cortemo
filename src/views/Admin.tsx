import { useEffect, useMemo, useState } from 'react'
import {
  Calculator,
  ChevronLeft,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Lock,
  Mail,
  Package,
  Plus,
  Send,
  Settings2,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { euro, GROUPS, PRODUCTS } from '../data/catalog'
import {
  addPartner,
  deleteDiscount,
  deletePartner,
  fetchDiscounts,
  fetchMailings,
  getDiscounts,
  saveDiscount,
  fetchOrders,
  fetchPartners,
  fetchProjects,
  getMailings,
  getOrders,
  getProjects,
  getPartners,
  getQuotes,
  hasBackend,
  isAdminAuthed,
  sendMailing,
  sendStatusMail,
  setOrderProject,
  setOrderStatus,
  setPartnerDiscount,
  signInAdmin,
  signOutAdmin,
  type Order,
  type OrderStatus,
  type Project,
} from '../lib/adminStore'
import { InvoiceView } from '../components/InvoiceView'
import { PricingAdmin } from './admin/PricingAdmin'
import { ProductsAdmin } from './admin/ProductsAdmin'
import { CalculationAdmin } from './admin/CalculationAdmin'
import { OffersAdmin, type OfferDraft } from './admin/OffersAdmin'
import { CustomersAdmin } from './admin/CustomersAdmin'
import { Card, EmptyRow, field, fieldSm, fmtDate, Stat } from './admin/ui'
import { parseCfg } from '../lib/cfg'
import { calcPrice } from '../lib/pricing'

type SectionId =
  | 'dashboard'
  | 'orders'
  | 'offertes'
  | 'calculatie'
  | 'producten'
  | 'collecties'
  | 'klanten'
  | 'configurator'
  | 'b2b'
  | 'mailings'

const SECTIONS: [SectionId, string, LucideIcon][] = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', Package],
  ['offertes', 'Offertes', FileText],
  ['calculatie', 'Calculatie', Calculator],
  ['producten', 'Producten', FolderOpen],
  ['collecties', 'Collecties', SlidersHorizontal],
  ['klanten', 'Klanten', Users],
  ['configurator', 'Configurator & prijzen', Settings2],
  ['b2b', 'B2B-partners', Handshake],
  ['mailings', 'Mailings', Mail],
]

const ORDER_STATUSES: OrderStatus[] = ['nieuw', 'in productie', 'verzonden', 'geannuleerd']

/* ---------- secties ---------- */

/** Omzet per week (laatste 8 weken) als eenvoudige SVG-staafgrafiek. */
function RevenueChart({ orders }: { orders: Order[] }) {
  const weeks: { label: string; total: number }[] = []
  const now = new Date()
  const monday = new Date(now)
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  for (let i = 7; i >= 0; i--) {
    const start = new Date(monday)
    start.setDate(monday.getDate() - i * 7)
    const end = new Date(start)
    end.setDate(start.getDate() + 7)
    const total = orders
      .filter((o) => o.status !== 'geannuleerd')
      .filter((o) => {
        const d = new Date(o.date)
        return d >= start && d < end
      })
      .reduce((s, o) => s + o.total, 0)
    weeks.push({
      label: start.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }),
      total,
    })
  }
  const max = Math.max(...weeks.map((w) => w.total), 1)
  const statuses: [OrderStatus, number][] = ORDER_STATUSES.map((status) => [
    status,
    orders.filter((o) => o.status === status).length,
  ])

  return (
    <Card title="Omzet per week" aside={<span className="text-[12px] text-white/40">laatste 8 weken</span>}>
      <div className="flex h-40 items-end gap-2" role="img" aria-label="Staafdiagram van de omzet per week">
        {weeks.map((w) => (
          <div key={w.label} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold tabular-nums text-white/55">
              {w.total > 0 ? '€' + Math.round(w.total) : ''}
            </span>
            <div
              className="w-full rounded-t-md bg-rust transition-all"
              style={{ height: Math.max(w.total > 0 ? 6 : 2, (w.total / max) * 110) + 'px', opacity: w.total > 0 ? 1 : 0.15 }}
            />
            <span className="max-w-full truncate text-[10px] text-white/45">{w.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-3">
        {statuses.map(([status, count]) => (
          <span key={status} className="rounded-full bg-white/5 px-3 py-1.5 text-[12px] text-white/60">
            {status}: <span className="font-bold tabular-nums text-white">{count}</span>
          </span>
        ))}
      </div>
    </Card>
  )
}

function Dashboard({ orders }: { orders: Order[] }) {
  const open = orders.filter((o) => o.status === 'nieuw' || o.status === 'in productie')
  const revenue = orders
    .filter((o) => o.status !== 'geannuleerd')
    .reduce((s, o) => s + o.total, 0)
  const quotes = getQuotes()
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Open orders" value={String(open.length)} />
        <Stat label="Omzet" value={euro(revenue)} />
        <Stat label="Open aanvragen" value={String(quotes.filter((q) => !q.handled).length)} />
        <Stat label="Producten" value={String(PRODUCTS.length)} />
      </div>
      <RevenueChart orders={orders} />
      <Card title="Recente orders">
        {orders.length === 0 ? (
          <EmptyRow>Nog geen orders. Plaats er een via de webshop-checkout.</EmptyRow>
        ) : (
          <ul className="divide-y divide-white/5">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[13px]">
                <span className="font-semibold">{o.id}</span>
                <span className="min-w-0 flex-1 truncate text-white/50">
                  {o.name} · {fmtDate(o.date)}
                </span>
                <span className="font-bold tabular-nums">{euro(o.total)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function Orders({ orders, setOrders }: { orders: Order[]; setOrders: (o: Order[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [mailState, setMailState] = useState<Record<string, string>>({})
  const [projects, setProjects] = useState<Project[]>([])
  const [invoiceOrder, setInvoiceOrder] = useState<Order | null>(null)

  useEffect(() => {
    setProjects(getProjects())
    void fetchProjects().then(setProjects)
  }, [])

  const mailStatus = async (o: Order) => {
    setMailState((s) => ({ ...s, [o.id]: 'bezig' }))
    const result = await sendStatusMail(o)
    setMailState((s) => ({ ...s, [o.id]: result.ok ? 'verstuurd' : result.error || 'mislukt' }))
  }

  return (
    <Card title="Orders" aside={<span className="text-[12px] text-white/40">{orders.length} totaal</span>}>
      {orders.length === 0 ? (
        <EmptyRow>Nog geen orders.</EmptyRow>
      ) : (
        <ul className="divide-y divide-white/5">
          {orders.map((o) => (
            <li key={o.id} className="py-4">
              <div className="grid gap-2 md:grid-cols-[100px_1.4fr_1fr_110px_150px] md:items-center md:gap-3">
                <button
                  onClick={() => setOpenId(openId === o.id ? null : o.id)}
                  className="text-left text-[13px] font-bold text-white transition-colors hover:text-rust"
                >
                  {o.id}
                </button>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">{o.name}</span>
                  <span className="block truncate text-[11px] text-white/45">
                    {o.email} · {o.city}
                  </span>
                </span>
                <span className="text-[12px] text-white/50">
                  {fmtDate(o.date)} · {o.items.reduce((s, i) => s + i.qty, 0)} artikelen
                </span>
                <span className="text-[13px] font-bold tabular-nums md:text-right">{euro(o.total)}</span>
                <select
                  value={o.status}
                  onChange={(e) => setOrders(setOrderStatus(o.id, e.target.value as OrderStatus))}
                  aria-label={'Status van order ' + o.id}
                  className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[12px] font-semibold text-white outline-none focus:border-rust"
                  style={{ colorScheme: 'dark' }}
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s} style={{ backgroundColor: '#14191E' }}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              {openId === o.id && (
                <div className="mt-3 space-y-3 rounded-xl bg-white/5 p-4">
                  <div className="grid gap-3 text-[12px] text-white/60 sm:grid-cols-2">
                    <div>
                      <span className="block font-semibold text-white/80">Bezorgadres</span>
                      {o.address || o.city || '—'}
                    </div>
                    <div>
                      <span className="block font-semibold text-white/80">Contact</span>
                      {o.name} · {o.email}
                    </div>
                  </div>
                  <ul className="divide-y divide-white/5 rounded-lg bg-white/5 px-3">
                    {o.items.map((item, i) => {
                      // maatwerk-items naprijzen: klantprijzen zijn clientside
                      // berekend, dus een afwijking t.o.v. de huidige engine
                      // wijst op manipulatie of gewijzigde tarieven
                      const cfg = item.key?.startsWith('cfg:') ? parseCfg(item.key.slice(4)) : null
                      const recomputed = cfg ? calcPrice(cfg).total : null
                      const deviates = recomputed !== null && Math.abs(recomputed - item.unitPrice) > 1
                      return (
                        <li key={i} className="py-2.5">
                          <div className="flex items-baseline justify-between gap-3 text-[13px]">
                            <span className="font-semibold">
                              {item.qty} × {item.name}
                            </span>
                            <span className="font-bold tabular-nums">{euro(item.unitPrice * item.qty)}</span>
                          </div>
                          {item.config?.length > 0 && (
                            <div className="mt-0.5 text-[11px] text-white/45">{item.config.join(' · ')}</div>
                          )}
                          {deviates && (
                            <div className="mt-1 rounded bg-rust/10 px-2 py-1 text-[11px] font-medium text-rust">
                              Naprijzen: engine rekent nu {euro(recomputed!)} per stuk (betaald{' '}
                              {euro(item.unitPrice)}) — controleer op manipulatie of tariefwijziging.
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {o.discountCode && (
                    <p className="text-[12px] text-white/50">
                      Kortingscode {o.discountCode}: −{euro(o.discountAmount)}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setInvoiceOrder(o)}
                      className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-semibold text-white hover:border-rust"
                    >
                      <FileText size={12} strokeWidth={2} /> Factuur F-{o.id}
                    </button>
                    <select
                      value={o.projectId || ''}
                      onChange={(e) => setOrders(setOrderProject(o.id, e.target.value))}
                      aria-label={'Project van order ' + o.id}
                      className="rounded-lg border border-white/15 bg-white/5 px-2 py-2 text-[12px] font-semibold text-white outline-none focus:border-rust"
                      style={{ colorScheme: 'dark' }}
                    >
                      <option value="" style={{ backgroundColor: '#14191E' }}>
                        Geen project
                      </option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id} style={{ backgroundColor: '#14191E' }}>
                          {p.id} · {p.name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => void mailStatus(o)}
                      disabled={mailState[o.id] === 'bezig'}
                      className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep disabled:opacity-60"
                    >
                      <Send size={12} strokeWidth={2} /> Mail status &ldquo;{o.status}&rdquo; naar klant
                    </button>
                    {mailState[o.id] && mailState[o.id] !== 'bezig' && (
                      <span
                        className={
                          'text-[12px] font-semibold ' +
                          (mailState[o.id] === 'verstuurd' ? 'text-ok' : 'text-rust')
                        }
                      >
                        {mailState[o.id]}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {invoiceOrder && <InvoiceView order={invoiceOrder} onClose={() => setInvoiceOrder(null)} />}
    </Card>
  )
}

function Collections() {
  return (
    <Card title="Collecties">
      <ul className="divide-y divide-white/5">
        {GROUPS.map((g) => (
          <li key={g.id} className="flex items-baseline gap-3 py-3 text-[13px]">
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">{g.label}</span>
              <span className="block text-[11px] text-white/45">{g.sub}</span>
            </span>
            <span className="tabular-nums text-white/50">
              {PRODUCTS.filter((p) => p.group === g.id).length} producten
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function ConfiguratorSettings() {
  return (
    <div className="space-y-4">
      <PricingAdmin />
      <DiscountCodes />
      <Card title="Producttypes & maatgrenzen">
        <p className="text-[13px] leading-relaxed text-white/55">
          De vier producttypes met hun maatgrenzen, staaldiktes en opties staan in{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[12px]">
            src/data/configuratorSchema.ts
          </code>
          . Het prijsmodel hierboven rekent 1-op-1 zoals het calculatieblad en werkt direct door
          in de klant-configurator en de interne calculatie.
        </p>
      </Card>
    </div>
  )
}

function DiscountCodes() {
  const [discounts, setDiscounts] = useState(getDiscounts)
  const [draft, setDraft] = useState({ code: '', percent: 10, expires: '' })
  const [error, setError] = useState('')
  useEffect(() => {
    void fetchDiscounts().then(setDiscounts)
  }, [])

  const add = () => {
    const code = draft.code.trim().toUpperCase()
    if (code.length < 3 || draft.percent <= 0 || draft.percent > 90) {
      setError('Code (3+ tekens) en een percentage tussen 1 en 90 zijn verplicht.')
      return
    }
    setError('')
    setDiscounts(saveDiscount({ code, percent: draft.percent, active: true, expires: draft.expires }))
    setDraft({ code: '', percent: 10, expires: '' })
  }

  return (
    <Card title="Kortingscodes">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Code</span>
          <input type="text" value={draft.code} placeholder="LENTE10" onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))} className={fieldSm + ' w-36 uppercase'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Korting %</span>
          <input type="number" min={1} max={90} value={draft.percent} onChange={(e) => setDraft((d) => ({ ...d, percent: +e.target.value }))} className={fieldSm + ' w-24 text-right tabular-nums'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Vervalt (optioneel)</span>
          <input type="date" value={draft.expires} onChange={(e) => setDraft((d) => ({ ...d, expires: e.target.value }))} className={fieldSm} style={{ colorScheme: 'dark' }} />
        </label>
        <button onClick={add} className="rounded-lg bg-rust px-4 py-2 text-[13px] font-semibold text-white hover:bg-rust-deep">
          Toevoegen
        </button>
      </div>
      {error && <p className="mt-2 text-[13px] font-medium text-rust">{error}</p>}
      {discounts.length > 0 && (
        <ul className="mt-4 divide-y divide-white/5">
          {discounts.map((d) => (
            <li key={d.code} className="flex flex-wrap items-center gap-3 py-2.5 text-[13px]">
              <span className="w-32 font-bold tracking-wide">{d.code}</span>
              <span className="tabular-nums text-white/60">{d.percent}%</span>
              <span className="min-w-0 flex-1 text-[12px] text-white/45">
                {d.expires ? 'geldig t/m ' + d.expires : 'geen vervaldatum'}
              </span>
              <button
                onClick={() => setDiscounts(saveDiscount({ ...d, active: !d.active }))}
                className={
                  'rounded-lg px-2.5 py-1.5 text-[12px] font-semibold ' +
                  (d.active ? 'bg-ok/20 text-ok' : 'bg-white/5 text-white/40')
                }
              >
                {d.active ? 'actief' : 'inactief'}
              </button>
              <button
                onClick={() => setDiscounts(deleteDiscount(d.code))}
                aria-label={'Verwijder code ' + d.code}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-rust"
              >
                <Trash2 size={13} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Partners() {
  const [partners, setPartners] = useState(getPartners)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState({ company: '', contact: '', email: '', discount: 10 })
  const [error, setError] = useState('')
  useEffect(() => {
    void fetchPartners().then(setPartners)
  }, [])

  const add = async () => {
    if (draft.company.trim().length < 2 || !/\S+@\S+\.\S+/.test(draft.email)) {
      setError('Vul minimaal bedrijfsnaam en een geldig e-mailadres in.')
      return
    }
    setError('')
    const result = await addPartner(draft)
    if (!result.ok) {
      setError(result.error || 'Toevoegen mislukt.')
      return
    }
    setPartners(await fetchPartners())
    setAdding(false)
    setDraft({ company: '', contact: '', email: '', discount: 10 })
  }

  return (
    <Card
      title="B2B-partners"
      aside={
        !adding ? (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep"
          >
            <Plus size={13} strokeWidth={2} /> Nieuwe partner
          </button>
        ) : undefined
      }
    >
      {adding && (
        <div className="mb-4 space-y-3 rounded-xl bg-white/5 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input type="text" placeholder="Bedrijfsnaam" value={draft.company} onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} className={fieldSm + ' w-full'} />
            <input type="text" placeholder="Contactpersoon" value={draft.contact} onChange={(e) => setDraft((d) => ({ ...d, contact: e.target.value }))} className={fieldSm + ' w-full'} />
            <input type="email" placeholder="E-mailadres" value={draft.email} onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))} className={fieldSm + ' w-full'} />
            <label className="flex items-center gap-2 text-[13px] text-white/70">
              korting
              <input type="number" min={0} max={40} value={draft.discount} onChange={(e) => setDraft((d) => ({ ...d, discount: +e.target.value }))} className={fieldSm + ' w-20 text-right tabular-nums'} />
              %
            </label>
          </div>
          {error && <p className="text-[13px] font-medium text-rust">{error}</p>}
          <div className="flex gap-2">
            <button onClick={() => void add()} className="rounded-xl bg-rust px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-rust-deep">
              Partner toevoegen
            </button>
            <button onClick={() => setAdding(false)} className="rounded-xl bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
              Annuleren
            </button>
          </div>
          <p className="text-[11px] text-white/40">
            Koppel daarna in Supabase-auth een account met dit e-mailadres zodat de partner kan
            inloggen; de korting werkt direct in portal en configurator.
          </p>
        </div>
      )}
      <ul className="divide-y divide-white/5">
        {partners.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 py-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-semibold">{p.company}</span>
              <span className="block text-[11px] text-white/45">
                {p.contact} · {p.email}
              </span>
            </span>
            <label className="flex items-center gap-2 text-[12px] text-white/55">
              korting
              <input
                type="number"
                min={0}
                max={40}
                value={p.discount}
                onChange={(e) => setPartners(setPartnerDiscount(p.id, +e.target.value))}
                aria-label={'Korting van ' + p.company}
                className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-right text-[13px] font-semibold tabular-nums text-white outline-none focus:border-rust"
              />
              %
            </label>
            <button
              onClick={() => {
                void deletePartner(p.id).then(() => fetchPartners().then(setPartners))
              }}
              aria-label={'Verwijder ' + p.company}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-rust"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}

function Mailings() {
  const [mailings, setMailings] = useState(getMailings)
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('Alle klanten')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    void fetchMailings().then(setMailings)
  }, [])

  const send = async () => {
    if (!subject.trim() || !body.trim()) return
    setError('')
    const result = await sendMailing(subject, body, audience)
    if (result.error) {
      setError(result.error)
      return
    }
    setMailings(await fetchMailings())
    setSubject('')
    setBody('')
    setSent(true)
    setTimeout(() => setSent(false), 2000)
  }

  return (
    <div className="space-y-4">
      <Card title="Nieuwe mailing">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
            <input
              type="text"
              placeholder="Onderwerp"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={field}
            />
            <select
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              aria-label="Doelgroep"
              className={field + ' appearance-none'}
              style={{ colorScheme: 'dark' }}
            >
              {['Alle klanten', 'B2B-partners', 'Nieuwsbrief'].map((a) => (
                <option key={a} value={a} style={{ backgroundColor: '#14191E' }}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <textarea
            rows={5}
            placeholder="Schrijf je bericht… wordt via Resend verstuurd aan de gekozen doelgroep."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={field + ' resize-none'}
          />
          {error && <p className="text-[13px] font-medium text-rust">{error}</p>}
          <button
            onClick={() => void send()}
            className={
              'flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition-all ' +
              (sent ? 'bg-ok' : 'bg-rust hover:bg-rust-deep')
            }
          >
            <Send size={14} strokeWidth={2} /> {sent ? 'Verstuurd' : 'Verstuur mailing'}
          </button>
        </div>
      </Card>
      <Card title="Verzonden">
        {mailings.length === 0 ? (
          <EmptyRow>Nog geen mailings verstuurd.</EmptyRow>
        ) : (
          <ul className="divide-y divide-white/5">
            {mailings.map((m) => (
              <li key={m.id} className="flex items-baseline gap-3 py-2.5 text-[13px]">
                <span className="min-w-0 flex-1 truncate font-semibold">{m.subject}</span>
                <span className="text-white/45">{m.audience}</span>
                <span className="tabular-nums text-white/45">{m.recipients} ontvangers</span>
                <span className="text-white/45">{fmtDate(m.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

/* ---------- login + shell ---------- */

function Login({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const valid = /\S+@\S+\.\S+/.test(email) && pw.length >= 4

  const submit = async () => {
    if (!valid) {
      setError('Vul een geldig e-mailadres en wachtwoord (4+ tekens) in.')
      return
    }
    setBusy(true)
    setError('')
    const result = await signInAdmin(email, pw)
    setBusy(false)
    if (result.ok) onAuthed()
    else setError(result.error || 'Inloggen mislukt.')
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 pb-20 pt-16 sm:px-6">
      <div className="liquid-glass rounded-2xl p-6 text-white sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-rust">
          <Lock size={18} strokeWidth={2} />
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.02em]">Cortemo Beheer</h1>
        <p className="mt-1 text-[13px] text-white/50">
          {hasBackend
            ? 'Log in met je beheeraccount (Supabase-auth).'
            : 'Demo-omgeving: elk e-mailadres met een wachtwoord van 4+ tekens werkt.'}
        </p>
        <div className="mt-5 space-y-4">
          <input
            type="email"
            placeholder="E-mailadres"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={field}
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            autoComplete="current-password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit()}
            className={field}
          />
          {error && <p className="text-[13px] font-medium text-rust">{error}</p>}
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="w-full rounded-xl bg-rust py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep disabled:opacity-60"
          >
            {busy ? 'Bezig…' : 'Inloggen'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Admin({ onExit }: { onExit: () => void }) {
  const [authed, setAuthed] = useState(isAdminAuthed)
  const [section, setSection] = useState<SectionId>('dashboard')
  const [orders, setOrders] = useState(getOrders)
  const [offerDraft, setOfferDraft] = useState<OfferDraft | null>(null)
  const title = useMemo(() => SECTIONS.find(([id]) => id === section)![1], [section])

  useEffect(() => {
    if (authed) void fetchOrders().then(setOrders)
  }, [authed])

  const startOffer = (draft: OfferDraft) => {
    setOfferDraft(draft)
    setSection('offertes')
  }

  if (!authed) return <Login onAuthed={() => setAuthed(true)} />

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white"
        >
          <ChevronLeft size={15} strokeWidth={2} /> Terug naar de webshop
        </button>
        <button
          onClick={() => {
            signOutAdmin()
            setAuthed(false)
          }}
          className="text-[12px] font-semibold text-white/40 transition-colors hover:text-white"
        >
          Uitloggen
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <aside className="liquid-glass shrink-0 self-start rounded-2xl p-2 max-lg:w-full lg:w-60 lg:p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Beheer-secties">
            {SECTIONS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setSection(id)}
                className={
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ' +
                  (id === section
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5 hover:text-white')
                }
              >
                <Icon size={15} strokeWidth={2} className={id === section ? 'text-rust' : ''} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">
            Cortemo Beheer
          </p>
          <h1 className="serif mb-5 mt-1 text-[28px] leading-[1.05] tracking-[-.02em] text-white sm:text-[32px]">
            {title}
          </h1>
          {section === 'dashboard' && <Dashboard orders={orders} />}
          {section === 'orders' && <Orders orders={orders} setOrders={setOrders} />}
          {section === 'offertes' && (
            <OffersAdmin draft={offerDraft} onDraftUsed={() => setOfferDraft(null)} />
          )}
          {section === 'calculatie' && (
            <CalculationAdmin onOffer={(line) => startOffer({ lines: [line] })} />
          )}
          {section === 'producten' && <ProductsAdmin />}
          {section === 'collecties' && <Collections />}
          {section === 'klanten' && <CustomersAdmin orders={orders} onOffer={startOffer} />}
          {section === 'configurator' && <ConfiguratorSettings />}
          {section === 'b2b' && <Partners />}
          {section === 'mailings' && <Mailings />}
        </div>
      </div>
    </div>
  )
}
