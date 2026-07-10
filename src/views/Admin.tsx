import { useEffect, useMemo, useState } from 'react'
import {
  ChevronLeft,
  FileText,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Lock,
  Mail,
  Package,
  Send,
  Settings2,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { euro, GROUPS, PRODUCTS } from '../data/catalog'
import { PRICING } from '../data/configuratorSchema'
import {
  fetchMailings,
  fetchOrders,
  fetchPartners,
  fetchPricing,
  fetchQuotes,
  getMailings,
  getOrders,
  getPartners,
  getPricing,
  getQuotes,
  hasBackend,
  isAdminAuthed,
  resetPricing,
  savePricing,
  sendMailing,
  setOrderStatus,
  setPartnerDiscount,
  setQuoteHandled,
  signInAdmin,
  signOutAdmin,
  updateProduct,
  type Order,
  type OrderStatus,
} from '../lib/adminStore'

type SectionId =
  | 'dashboard'
  | 'orders'
  | 'offertes'
  | 'producten'
  | 'collecties'
  | 'configurator'
  | 'b2b'
  | 'mailings'

const SECTIONS: [SectionId, string, LucideIcon][] = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['orders', 'Orders', Package],
  ['offertes', 'Offertes', FileText],
  ['producten', 'Producten', FolderOpen],
  ['collecties', 'Collecties', SlidersHorizontal],
  ['configurator', 'Configurator & prijzen', Settings2],
  ['b2b', 'B2B-partners', Handshake],
  ['mailings', 'Mailings', Mail],
]

const ORDER_STATUSES: OrderStatus[] = ['nieuw', 'in productie', 'verzonden', 'geannuleerd']

const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })

function Card({ title, children, aside }: { title?: string; children: React.ReactNode; aside?: React.ReactNode }) {
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="liquid-glass rounded-2xl p-5 text-white">
      <div className="text-[11px] font-semibold uppercase tracking-[.12em] text-white/40">
        {label}
      </div>
      <div className="mt-1 text-[24px] font-extrabold tabular-nums">{value}</div>
    </div>
  )
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-[13px] text-white/40">{children}</p>
}

/* ---------- secties ---------- */

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
        <Stat label="Open offertes" value={String(quotes.filter((q) => !q.handled).length)} />
        <Stat label="Producten" value={String(PRODUCTS.length)} />
      </div>
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
  return (
    <Card title="Orders" aside={<span className="text-[12px] text-white/40">{orders.length} totaal</span>}>
      {orders.length === 0 ? (
        <EmptyRow>Nog geen orders.</EmptyRow>
      ) : (
        <ul className="divide-y divide-white/5">
          {orders.map((o) => (
            <li key={o.id} className="grid gap-2 py-4 md:grid-cols-[100px_1.4fr_1fr_110px_150px] md:items-center md:gap-3">
              <span className="text-[13px] font-bold">{o.id}</span>
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
                className="rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-[12px] font-semibold text-white outline-none focus:border-rust"
                style={{ colorScheme: 'dark' }}
              >
                {ORDER_STATUSES.map((s) => (
                  <option key={s} value={s} style={{ backgroundColor: '#14191E' }}>
                    {s}
                  </option>
                ))}
              </select>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

function Quotes() {
  const [quotes, setQuotes] = useState(getQuotes)
  useEffect(() => {
    void fetchQuotes().then(setQuotes)
  }, [])
  return (
    <Card title="Offerte-aanvragen" aside={<span className="text-[12px] text-white/40">{quotes.length} totaal</span>}>
      {quotes.length === 0 ? (
        <EmptyRow>Nog geen aanvragen. Ze verschijnen hier zodra het maatwerkformulier wordt ingestuurd.</EmptyRow>
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
  )
}

function Products() {
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savedId, setSavedId] = useState<string | null>(null)

  const save = async (id: string) => {
    const price = parseFloat(drafts[id])
    if (isNaN(price) || price <= 0) return
    const ok = await updateProduct(id, { price })
    if (ok) {
      const product = PRODUCTS.find((p) => p.id === id)
      if (product) product.price = price
      setDrafts((d) => {
        const { [id]: _removed, ...rest } = d
        return rest
      })
      setSavedId(id)
      setTimeout(() => setSavedId(null), 1500)
    }
  }

  return (
    <Card
      title="Producten"
      aside={
        <span className="text-[12px] text-white/40">
          {hasBackend ? 'live gekoppeld aan de database' : 'bron: src/data/catalog.ts'}
        </span>
      }
    >
      <ul className="divide-y divide-white/5">
        {PRODUCTS.map((p) => (
          <li key={p.id} className="flex items-center gap-3 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
            <span className="hidden text-white/45 sm:block">{p.sub}</span>
            {hasBackend ? (
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  step="1"
                  value={drafts[p.id] ?? String(p.price)}
                  onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                  aria-label={'Prijs van ' + p.name}
                  className="w-24 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-right text-[13px] font-semibold tabular-nums text-white outline-none focus:border-rust"
                />
                {drafts[p.id] !== undefined && drafts[p.id] !== String(p.price) && (
                  <button
                    onClick={() => void save(p.id)}
                    className="rounded-lg bg-rust px-2.5 py-1.5 text-[12px] font-semibold text-white hover:bg-rust-deep"
                  >
                    Opslaan
                  </button>
                )}
                {savedId === p.id && <span className="text-[12px] font-semibold text-ok">✓</span>}
              </span>
            ) : (
              <span className="font-bold tabular-nums">{euro(p.price)}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-white/40">
        {hasBackend
          ? 'Prijswijzigingen gaan direct de database in en zijn meteen zichtbaar in de shop.'
          : 'Zonder gekoppelde database is deze lijst alleen-lezen. Koppel Supabase (zie supabase/migrations) om prijzen en teksten hier direct te bewerken.'}
      </p>
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
  const [settings, setSettings] = useState(getPricing)
  const [saved, setSaved] = useState(false)
  useEffect(() => {
    void fetchPricing().then(setSettings)
  }, [])

  const FIELDS: [keyof typeof settings, string, string][] = [
    ['steelPerKg', 'Staalprijs per kg', 'incl. snijverlies en marge'],
    ['weldPerM', 'Laswerk per meter naad', 'lassen, slijpen en afwerken'],
    ['base', 'Startkosten per configuratie', 'orderhandling en tekenwerk'],
    ['b2bDiscount', 'B2B-korting (fractie)', '0.15 = 15%'],
  ]

  const save = () => {
    savePricing(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="space-y-4">
      <Card
        title="Configurator-tarieven"
        aside={
          <button
            onClick={() => {
              resetPricing()
              setSettings({ ...PRICING })
            }}
            className="text-[12px] font-semibold text-white/40 transition-colors hover:text-white"
          >
            Herstel standaard
          </button>
        }
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map(([key, label, hint]) => (
            <div key={key}>
              <div className="mb-1.5 text-[13px] font-semibold">{label}</div>
              <input
                type="number"
                step="0.01"
                value={settings[key]}
                onChange={(e) => setSettings((s) => ({ ...s, [key]: +e.target.value }))}
                className={field}
              />
              <div className="mt-1 text-[11px] text-white/40">{hint}</div>
            </div>
          ))}
        </div>
        <button
          onClick={save}
          className={
            'mt-5 rounded-xl px-5 py-2.5 text-[14px] font-semibold text-white transition-all ' +
            (saved ? 'bg-ok' : 'bg-rust hover:bg-rust-deep')
          }
        >
          {saved ? 'Opgeslagen — direct actief in de shop' : 'Opslaan'}
        </button>
      </Card>
      <Card title="Producttypes & maatgrenzen">
        <p className="text-[13px] leading-relaxed text-white/55">
          De vier producttypes met hun maatgrenzen, staaldiktes en opties staan in{' '}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[12px]">
            src/data/configuratorSchema.ts
          </code>
          . De tarieven hierboven overschrijven dat schema live. Volgende stap: ook de types en
          opties hier bewerkbaar maken zodra er een database aan hangt.
        </p>
      </Card>
    </div>
  )
}

function Partners() {
  const [partners, setPartners] = useState(getPartners)
  useEffect(() => {
    void fetchPartners().then(setPartners)
  }, [])
  return (
    <Card title="B2B-partners" aside={<span className="text-[12px] text-white/40">{partners.length} actief</span>}>
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
                className="w-16 rounded-lg border border-white/15 bg-white/5 px-2 py-1.5 text-right text-[13px] font-semibold tabular-nums text-white outline-none focus:border-rust"
              />
              %
            </label>
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
            <div className="relative">
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
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
          </div>
          <textarea
            rows={5}
            placeholder={
              hasBackend
                ? 'Schrijf je bericht… wordt via Resend verstuurd aan de gekozen doelgroep.'
                : 'Schrijf je bericht… (zonder gekoppelde backend wordt de mailing alleen gelogd)'
            }
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
            <Send size={14} strokeWidth={2} /> {sent ? 'In wachtrij gezet' : 'Verstuur mailing'}
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
  const title = useMemo(() => SECTIONS.find(([id]) => id === section)![1], [section])

  useEffect(() => {
    if (authed) void fetchOrders().then(setOrders)
  }, [authed])

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
          {section === 'offertes' && <Quotes />}
          {section === 'producten' && <Products />}
          {section === 'collecties' && <Collections />}
          {section === 'configurator' && <ConfiguratorSettings />}
          {section === 'b2b' && <Partners />}
          {section === 'mailings' && <Mailings />}
        </div>
      </div>
    </div>
  )
}
