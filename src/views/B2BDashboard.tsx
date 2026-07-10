import { useEffect, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  FileUp,
  FolderOpen,
  Handshake,
  LayoutDashboard,
  Package,
  Plus,
  Printer,
  Ruler,
  Settings,
  Store,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { euro } from '../data/catalog'
import {
  fetchInvoices,
  fetchPartnerOffers,
  fetchPartnerOrders,
  fetchPartnerProjects,
  getActivePartner,
  getInvoices,
  getOffers,
  getOrders,
  getProjects,
  hasBackend,
  saveProject,
  setOfferStatus,
  setOrderProject,
  signInPartner,
  signOutPartner,
  type Invoice,
  type Offer,
  type Order,
  type Project,
} from '../lib/adminStore'
import { InvoiceView } from '../components/InvoiceView'
import { Card, EmptyRow, fieldSm, fmtDate } from './admin/ui'

type PortalTab = 'dashboard' | 'projecten' | 'bestellingen' | 'offertes' | 'instellingen'

const NAV_ITEMS: [PortalTab, string, LucideIcon][] = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['projecten', 'Projecten', FolderOpen],
  ['bestellingen', 'Bestellingen', Package],
  ['offertes', 'Offertes', FileText],
  ['instellingen', 'Instellingen', Settings],
]

const ORDER_STATUS_STYLE: Record<Order['status'], string> = {
  nieuw: 'bg-white/10 text-white/70',
  'in productie': 'bg-rust/20 text-rust',
  verzonden: 'bg-ok/20 text-ok',
  geannuleerd: 'bg-white/10 text-white/40 line-through',
}

function StatusChip({ status }: { status: Order['status'] }) {
  return (
    <span className={'rounded-full px-2.5 py-1 text-[11px] font-semibold ' + ORDER_STATUS_STYLE[status]}>
      {status}
    </span>
  )
}

/* ---------- login ---------- */

function PartnerLogin({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    setError('')
    const result = await signInPartner(email, pw)
    setBusy(false)
    if (result.partner) onDone()
    else setError(result.error || 'Inloggen mislukt.')
  }

  const field =
    'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

  return (
    <div className="mx-auto flex max-w-md flex-col pt-6">
      <div className="liquid-glass rounded-2xl p-6 text-white sm:p-8">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-rust">
          <Handshake size={18} strokeWidth={2} />
        </span>
        <h1 className="mt-4 text-[22px] font-extrabold tracking-[-.02em]">B2B Partner login</h1>
        <p className="mt-1 text-[13px] leading-relaxed text-white/50">
          {hasBackend
            ? 'Log in met je partneraccount voor jouw projecten, orders en facturen.'
            : 'Demo: log in met een partner-e-mailadres (bijv. jan@groenwerk.nl), wachtwoord vrij.'}
        </p>
        <div className="mt-5 space-y-4">
          <input type="email" placeholder="E-mailadres" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
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
          <p className="text-center text-[12px] text-white/40">
            Nog geen partner? Mail{' '}
            <a href="mailto:hallo@cortemo.nl" className="text-rust">
              hallo@cortemo.nl
            </a>{' '}
            voor een zakelijk account.
          </p>
        </div>
      </div>
    </div>
  )
}

/* ---------- detailweergaven ---------- */

function OrderDetail({
  order,
  projects,
  invoiceId,
  onBack,
  onInvoice,
  onProject,
}: {
  order: Order
  projects: Project[]
  /** Officieel factuurnummer als de order al gefactureerd is. */
  invoiceId?: string
  onBack: () => void
  onInvoice: () => void
  onProject: (projectId: string) => void
}) {
  return (
    <Card
      title={'Bestelling ' + order.id}
      aside={
        <button onClick={onBack} className="text-[12px] font-semibold text-white/40 hover:text-white">
          ← alle bestellingen
        </button>
      }
    >
      <div className="grid gap-3 text-[12px] text-white/60 sm:grid-cols-3">
        <div>
          <span className="block font-semibold text-white/80">Besteld op</span>
          {fmtDate(order.date)}
        </div>
        <div>
          <span className="block font-semibold text-white/80">Bezorgadres</span>
          {order.address || order.city || '—'}
        </div>
        <div>
          <span className="block font-semibold text-white/80">Status</span>
          <StatusChip status={order.status} />
        </div>
      </div>

      <ul className="mt-4 divide-y divide-white/5 rounded-lg bg-white/5 px-3">
        {order.items.map((item, i) => (
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
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-baseline justify-between text-[14px] font-extrabold">
        <span>Totaal incl. btw</span>
        <span className="tabular-nums">{euro(order.total)}</span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
        <button
          onClick={onInvoice}
          className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep"
        >
          <Printer size={12} strokeWidth={2} />{' '}
          {invoiceId ? 'Factuur ' + invoiceId : 'Factuur (proforma)'}
        </button>
        <label className="ml-auto flex items-center gap-2 text-[12px] text-white/55">
          Project
          <select
            value={order.projectId}
            onChange={(e) => onProject(e.target.value)}
            className={fieldSm}
            style={{ colorScheme: 'dark' }}
          >
            <option value="" style={{ backgroundColor: '#14191E' }}>
              — geen —
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} style={{ backgroundColor: '#14191E' }}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </Card>
  )
}

/* ---------- hoofdcomponent ---------- */

export function B2BDashboard({
  onShop,
  onConfigure,
}: {
  onShop: () => void
  onConfigure: () => void
}) {
  const [partner, setPartner] = useState(getActivePartner)
  const [tab, setTab] = useState<PortalTab>('dashboard')
  const [orders, setOrders] = useState<Order[]>([])
  const [offers, setOffers] = useState<Offer[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [invoice, setInvoice] = useState<Order | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState({ name: '', reference: '', siteAddress: '' })

  const reload = (p = partner) => {
    if (!p) return
    // lokale cache direct tonen, daarna op de achtergrond verversen — zo
    // blijft de portal bruikbaar als een backend-request blijft hangen
    const mine = (email: string) => email.toLowerCase() === p.email.toLowerCase()
    setProjects(getProjects().filter((pr) => mine(pr.partnerEmail)))
    setOrders(
      getOrders().filter(
        (o) =>
          mine(o.email) ||
          getProjects().some((pr) => pr.id === o.projectId && mine(pr.partnerEmail)),
      ),
    )
    setOffers(getOffers().filter((o) => mine(o.email)))
    setInvoices(getInvoices().filter((i) => mine(i.order.email)))
    void fetchPartnerOrders(p).then(setOrders)
    void fetchPartnerOffers(p).then(setOffers)
    void fetchPartnerProjects(p).then(setProjects)
    // RLS geeft partners alleen hun eigen facturen terug
    void fetchInvoices().then(setInvoices)
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => reload(), [partner?.email])

  if (!partner) {
    return (
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
        <button onClick={onShop} className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white">
          <ChevronLeft size={15} strokeWidth={2} /> Terug naar de webshop
        </button>
        <PartnerLogin onDone={() => setPartner(getActivePartner())} />
      </div>
    )
  }

  const project = projects.find((p) => p.id === projectId) ?? null
  const order = orders.find((o) => o.id === orderId) ?? null
  const projectOrders = (p: Project) => orders.filter((o) => o.projectId === p.id)
  const projectOffers = (p: Project) => offers.filter((o) => o.projectId === p.id)
  const projectValue = (p: Project) =>
    projectOrders(p).reduce((s, o) => s + o.total, 0) + projectOffers(p).filter((o) => o.status === 'geaccepteerd').reduce((s, o) => s + o.total, 0)

  const openOrder = (id: string) => {
    setOrderId(id)
    setTab('bestellingen')
  }

  const createProject = () => {
    if (draft.name.trim().length < 2) return
    const project: Project = {
      id: 'PR-' + String(Date.now()).slice(-6),
      date: new Date().toISOString(),
      partnerEmail: partner.email,
      name: draft.name,
      reference: draft.reference,
      siteAddress: draft.siteAddress,
      status: 'actief',
    }
    saveProject(project)
    setProjects([project, ...projects])
    setDraft({ name: '', reference: '', siteAddress: '' })
    setCreating(false)
    setProjectId(project.id)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pb-20 sm:pt-10">
      {invoice && (
        <InvoiceView
          order={invoice}
          invoice={invoices.find((i) => i.orderId === invoice.id) ?? null}
          onClose={() => setInvoice(null)}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={onShop} className="flex items-center gap-1.5 text-[13px] font-semibold text-white/50 transition-colors hover:text-white">
          <ChevronLeft size={15} strokeWidth={2} /> Terug naar de webshop
        </button>
        <button
          onClick={() => {
            signOutPartner()
            setPartner(null)
          }}
          className="text-[12px] font-semibold text-white/40 transition-colors hover:text-white"
        >
          Uitloggen
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        {/* navigatie */}
        <aside className="liquid-glass shrink-0 self-start rounded-2xl p-2 max-lg:w-full lg:w-56 lg:p-3">
          <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Portal-secties">
            {NAV_ITEMS.map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id)
                  setProjectId(null)
                  setOrderId(null)
                }}
                className={
                  'flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ' +
                  (id === tab ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5 hover:text-white')
                }
              >
                <Icon size={15} strokeWidth={2} className={id === tab ? 'text-rust' : ''} />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          {/* kop */}
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/40">
                B2B Professionals Portal
              </p>
              <h1 className="serif mt-1 text-[28px] leading-[1.05] tracking-[-.02em] text-white sm:text-[34px]">
                {partner.company.replace(/ B\.V\.$/, '')}
              </h1>
            </div>
            <span className="rounded-full border border-rust/40 bg-rust/10 px-4 py-2 text-[13px] font-semibold text-rust">
              Jouw B2B-voordeel: {partner.discount}%
            </span>
          </div>

          {/* dashboard */}
          {tab === 'dashboard' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <QuickAction icon={Ruler} title="Nieuw maatwerk starten" sub="Ontwerp tot op de millimeter in de 3D-configurator." onClick={onConfigure} />
                <QuickAction icon={FileUp} title="Eigen DXF uploaden" sub="Upload je tekening en ontvang direct een calculatie." onClick={onConfigure} />
                <QuickAction icon={Store} title="Standaard assortiment" sub="Bestel uit de collecties met je partnerkorting." onClick={onShop} />
              </div>
              <Card title="Lopende projecten" aside={<button onClick={() => setTab('projecten')} className="text-[12px] font-semibold text-white/40 hover:text-white">alle projecten →</button>}>
                {projects.filter((p) => p.status === 'actief').length === 0 ? (
                  <EmptyRow>Nog geen projecten. Maak er een aan onder &ldquo;Projecten&rdquo;.</EmptyRow>
                ) : (
                  <ProjectList
                    projects={projects.filter((p) => p.status === 'actief').slice(0, 4)}
                    value={projectValue}
                    count={(p) => projectOrders(p).length}
                    onOpen={(id) => {
                      setTab('projecten')
                      setProjectId(id)
                    }}
                  />
                )}
              </Card>
              <Card title="Recente bestellingen" aside={<button onClick={() => setTab('bestellingen')} className="text-[12px] font-semibold text-white/40 hover:text-white">alles →</button>}>
                {orders.length === 0 ? (
                  <EmptyRow>Nog geen bestellingen op dit account.</EmptyRow>
                ) : (
                  <OrderList orders={orders.slice(0, 4)} onOpen={openOrder} />
                )}
              </Card>
            </div>
          )}

          {/* projecten */}
          {tab === 'projecten' && !project && (
            <Card
              title="Projecten"
              aside={
                !creating ? (
                  <button onClick={() => setCreating(true)} className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep">
                    <Plus size={13} strokeWidth={2} /> Nieuw project
                  </button>
                ) : undefined
              }
            >
              {creating && (
                <div className="mb-4 space-y-3 rounded-xl bg-white/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <input type="text" placeholder="Projectnaam (bijv. Achtertuin Fam. Jansen)" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} className={fieldSm + ' w-full sm:col-span-2'} />
                    <input type="text" placeholder="Eigen referentie" value={draft.reference} onChange={(e) => setDraft((d) => ({ ...d, reference: e.target.value }))} className={fieldSm + ' w-full'} />
                  </div>
                  <input type="text" placeholder="Projectadres (bezorg-/werklocatie)" value={draft.siteAddress} onChange={(e) => setDraft((d) => ({ ...d, siteAddress: e.target.value }))} className={fieldSm + ' w-full'} />
                  <div className="flex gap-2">
                    <button onClick={createProject} className="rounded-xl bg-rust px-5 py-2.5 text-[14px] font-semibold text-white hover:bg-rust-deep">
                      Project aanmaken
                    </button>
                    <button onClick={() => setCreating(false)} className="rounded-xl bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
                      Annuleren
                    </button>
                  </div>
                </div>
              )}
              {projects.length === 0 ? (
                <EmptyRow>Nog geen projecten. Bundel je orders en offertes per klus.</EmptyRow>
              ) : (
                <ProjectList projects={projects} value={projectValue} count={(p) => projectOrders(p).length} onOpen={setProjectId} />
              )}
            </Card>
          )}

          {tab === 'projecten' && project && (
            <div className="space-y-4">
              <Card
                title={project.name}
                aside={
                  <button onClick={() => setProjectId(null)} className="text-[12px] font-semibold text-white/40 hover:text-white">
                    ← alle projecten
                  </button>
                }
              >
                <div className="grid gap-3 text-[12px] text-white/60 sm:grid-cols-3">
                  <div>
                    <span className="block font-semibold text-white/80">Referentie</span>
                    {project.reference || '—'}
                  </div>
                  <div>
                    <span className="block font-semibold text-white/80">Projectadres</span>
                    {project.siteAddress || '—'}
                  </div>
                  <div>
                    <span className="block font-semibold text-white/80">Waarde</span>
                    {euro(projectValue(project))}
                  </div>
                </div>
              </Card>
              <Card title={'Bestellingen in dit project (' + projectOrders(project).length + ')'}>
                {projectOrders(project).length === 0 ? (
                  <EmptyRow>Koppel bestellingen aan dit project via het besteldetail.</EmptyRow>
                ) : (
                  <OrderList orders={projectOrders(project)} onOpen={openOrder} />
                )}
              </Card>
              <Card title={'Offertes in dit project (' + projectOffers(project).length + ')'}>
                {projectOffers(project).length === 0 ? (
                  <EmptyRow>Nog geen offertes gekoppeld.</EmptyRow>
                ) : (
                  <OfferList offers={projectOffers(project)} onDecide={(o, status) => { setOfferStatus(o.id, status); reload() }} />
                )}
              </Card>
            </div>
          )}

          {/* bestellingen */}
          {tab === 'bestellingen' &&
            (order ? (
              <OrderDetail
                order={order}
                projects={projects}
                invoiceId={invoices.find((i) => i.orderId === order.id)?.id}
                onBack={() => setOrderId(null)}
                onInvoice={() => setInvoice(order)}
                onProject={(pid) => {
                  setOrderProject(order.id, pid)
                  setOrders(orders.map((o) => (o.id === order.id ? { ...o, projectId: pid } : o)))
                }}
              />
            ) : (
              <Card title="Bestellingen" aside={<span className="text-[12px] text-white/40">{orders.length} totaal</span>}>
                {orders.length === 0 ? (
                  <EmptyRow>Nog geen bestellingen op dit account.</EmptyRow>
                ) : (
                  <OrderList orders={orders} onOpen={openOrder} />
                )}
              </Card>
            ))}

          {/* offertes */}
          {tab === 'offertes' && (
            <Card title="Offertes" aside={<span className="text-[12px] text-white/40">{offers.length} totaal</span>}>
              {offers.length === 0 ? (
                <EmptyRow>Nog geen offertes. Vraag er een aan via de configurator.</EmptyRow>
              ) : (
                <OfferList offers={offers} onDecide={(o, status) => { setOfferStatus(o.id, status); reload() }} />
              )}
            </Card>
          )}

          {/* instellingen */}
          {tab === 'instellingen' && (
            <Card title="Accountgegevens">
              <div className="grid gap-4 text-[13px] sm:grid-cols-2">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-white/40">Bedrijf</span>
                  {partner.company}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-white/40">Contactpersoon</span>
                  {partner.contact || '—'}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-white/40">E-mailadres</span>
                  {partner.email}
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-[.1em] text-white/40">Partnerkorting</span>
                  {partner.discount}% op alle maatwerkprijzen
                </div>
              </div>
              <p className="mt-5 text-[12px] leading-relaxed text-white/40">
                Gegevens wijzigen of extra gebruikers toevoegen? Mail{' '}
                <a href="mailto:hallo@cortemo.nl" className="text-rust">
                  hallo@cortemo.nl
                </a>
                .
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- lijstjes ---------- */

function ProjectList({
  projects,
  value,
  count,
  onOpen,
}: {
  projects: Project[]
  value: (p: Project) => number
  count: (p: Project) => number
  onOpen: (id: string) => void
}) {
  return (
    <ul className="divide-y divide-white/5">
      {projects.map((p) => (
        <li key={p.id}>
          <button onClick={() => onOpen(p.id)} className="group flex w-full flex-wrap items-center gap-3 py-3.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold group-hover:text-rust">{p.name}</span>
              <span className="block truncate text-[11px] text-white/45">
                {p.reference && p.reference + ' · '}
                {p.siteAddress || 'geen projectadres'} · {fmtDate(p.date)}
              </span>
            </span>
            <span className="text-[12px] text-white/50">{count(p)} orders</span>
            <span className="text-[13px] font-bold tabular-nums">{euro(value(p))}</span>
            <span className={'rounded-full px-2.5 py-1 text-[11px] font-semibold ' + (p.status === 'actief' ? 'bg-ok/20 text-ok' : 'bg-white/10 text-white/50')}>
              {p.status}
            </span>
            <ChevronRight size={14} strokeWidth={2} className="text-white/30 group-hover:text-rust" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function OrderList({ orders, onOpen }: { orders: Order[]; onOpen: (id: string) => void }) {
  return (
    <ul className="divide-y divide-white/5">
      {orders.map((o) => (
        <li key={o.id}>
          <button onClick={() => onOpen(o.id)} className="group flex w-full flex-wrap items-center gap-3 py-3.5 text-left">
            <span className="text-[13px] font-bold group-hover:text-rust">{o.id}</span>
            <span className="min-w-0 flex-1 truncate text-[12px] text-white/50">
              {fmtDate(o.date)} · {o.items.reduce((s, i) => s + i.qty, 0)} artikelen
              {o.address && ' · ' + o.address}
            </span>
            <span className="text-[13px] font-bold tabular-nums">{euro(o.total)}</span>
            <StatusChip status={o.status} />
            <ChevronRight size={14} strokeWidth={2} className="text-white/30 group-hover:text-rust" />
          </button>
        </li>
      ))}
    </ul>
  )
}

function OfferList({
  offers,
  onDecide,
}: {
  offers: Offer[]
  onDecide: (offer: Offer, status: Offer['status']) => void
}) {
  return (
    <ul className="divide-y divide-white/5">
      {offers.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-3 py-3.5">
          <span className="text-[13px] font-bold">{o.id}</span>
          <span className="min-w-0 flex-1 truncate text-[12px] text-white/50">
            {fmtDate(o.date)} · {o.lines.length} regel{o.lines.length === 1 ? '' : 's'}
            {o.validUntil && ' · geldig t/m ' + o.validUntil}
          </span>
          <span className="text-[13px] font-bold tabular-nums">{euro(o.total)}</span>
          <span
            className={
              'rounded-full px-2.5 py-1 text-[11px] font-semibold ' +
              (o.status === 'geaccepteerd' ? 'bg-ok/20 text-ok' : o.status === 'verzonden' ? 'bg-rust/20 text-rust' : 'bg-white/10 text-white/60')
            }
          >
            {o.status}
          </span>
          {o.status === 'verzonden' && (
            <span className="flex gap-1.5">
              <button onClick={() => onDecide(o, 'geaccepteerd')} className="rounded-lg bg-ok px-2.5 py-1.5 text-[12px] font-semibold text-white hover:brightness-110">
                Accepteren
              </button>
              <button onClick={() => onDecide(o, 'afgewezen')} className="rounded-lg bg-white/5 px-2.5 py-1.5 text-[12px] font-semibold text-white/60 hover:bg-white/10">
                Afwijzen
              </button>
            </span>
          )}
        </li>
      ))}
    </ul>
  )
}

function QuickAction({
  icon: Icon,
  title,
  sub,
  onClick,
}: {
  icon: LucideIcon
  title: string
  sub: string
  onClick?: () => void
}) {
  return (
    <button onClick={onClick} className="liquid-glass group flex flex-col items-start gap-3 rounded-2xl p-5 text-left transition-all hover:-translate-y-0.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-rust">
        <Icon size={18} strokeWidth={2} />
      </span>
      <span>
        <span className="block text-[14px] font-bold text-white">{title}</span>
        <span className="mt-0.5 block text-[12px] leading-relaxed text-white/50">{sub}</span>
      </span>
    </button>
  )
}
