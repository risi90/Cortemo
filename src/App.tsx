import { useCallback, useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { CortemoNav } from './components/CortemoNav'
import { CortemoFooter } from './components/CortemoFooter'
import { CartDrawer } from './components/CartDrawer'
import { GroupGrid } from './views/GroupGrid'
import { ProductList } from './views/ProductList'
import { ProductDetail } from './views/ProductDetail'
import { Inspiration } from './views/Inspiration'
import { B2BDashboard } from './views/B2BDashboard'
import { Configurator } from './views/Configurator'
import { Checkout } from './views/Checkout'
import { Story } from './views/Story'
import { Service } from './views/Service'
import { Admin } from './views/Admin'
import { GROUPS, hydrateCatalog, hydrateCollections, PRODUCTS, type GroupId } from './data/catalog'
import { ACCELERATOR, cartCount, type CartItem } from './lib/cart'
import { fetchCollections, fetchDbProducts, fetchPricing, getCollections } from './lib/adminStore'
import { useTheme } from './lib/useTheme'

type Page = 'inspiratie' | 'b2b' | 'maatwerk' | 'checkout' | 'verhaal' | 'service' | 'admin'
type View = 'root' | 'list' | 'pdp' | Page

type NavState = {
  view: View
  groupId: GroupId
  productId: string
  /** Voorgeselecteerde subcategorie voor de productlijst (bijv. vanuit "Shop deze look"). */
  sub: string | null
}

const PAGES: Page[] = ['inspiratie', 'b2b', 'maatwerk', 'checkout', 'verhaal', 'service', 'admin']

/** Nette, SEO-vriendelijke paden per pagina (met SPA-rewrite op de host). */
const PAGE_PATHS: Record<Page, string> = {
  inspiratie: '/inspiratie',
  b2b: '/zakelijk',
  maatwerk: '/maatwerk',
  checkout: '/afrekenen',
  verhaal: '/verhaal',
  service: '/service',
  admin: '/beheer',
}

function stateFromLocation(): NavState {
  const base = { groupId: 'planten' as GroupId, productId: PRODUCTS[0].id, sub: null }
  const path = location.pathname.replace(/\/+$/, '') || '/'
  const seg = path.split('/').filter(Boolean)

  // padgebaseerde routes
  if (seg[0] === 'collectie' && GROUPS.some((g) => g.id === seg[1])) {
    return { ...base, view: 'list', groupId: seg[1] as GroupId }
  }
  if (seg[0] === 'product') {
    const product = PRODUCTS.find((p) => p.id === seg[1])
    if (product) return { ...base, view: 'pdp', groupId: product.group, productId: product.id }
  }
  const pageEntry = (Object.entries(PAGE_PATHS) as [Page, string][]).find(([, p]) => p === path)
  if (pageEntry) return { ...base, view: pageEntry[0] }

  // oude query-param-links blijven werken (worden daarna ge-redirect)
  const qs = new URLSearchParams(location.search)
  const cat = qs.get('cat')
  const page = qs.get('page')
  const product = PRODUCTS.find((p) => p.id === qs.get('product')) || null
  const group = GROUPS.some((g) => g.id === cat) ? (cat as GroupId) : null
  if (product) return { ...base, view: 'pdp', groupId: product.group, productId: product.id }
  if (group) return { ...base, view: 'list', groupId: group }
  if (PAGES.includes(page as Page)) return { ...base, view: page as Page }
  return { ...base, view: 'root' }
}

function urlFor(s: NavState): string {
  switch (s.view) {
    case 'root':
      return '/'
    case 'list':
      return '/collectie/' + s.groupId
    case 'pdp':
      return '/product/' + s.productId
    default:
      return PAGE_PATHS[s.view]
  }
}

/** Paginatitel en meta per view; beheer en afrekenen blijven uit de index. */
function applySeo(s: NavState) {
  const group = GROUPS.find((g) => g.id === s.groupId)
  const product = PRODUCTS.find((p) => p.id === s.productId)
  const titles: Record<View, string> = {
    root: 'Cortemo — Maatwerk cortenstaal, tot op de millimeter',
    list: (group?.label ?? 'Collectie') + ' — Cortemo',
    pdp: (product?.name ?? 'Product') + ' — Cortemo',
    inspiratie: 'Inspiratie & projecten — Cortemo',
    b2b: 'Zakelijk portal voor hoveniers en architecten — Cortemo',
    maatwerk: '3D Maatwerk Configurator — Cortemo',
    checkout: 'Afrekenen — Cortemo',
    verhaal: 'Ons verhaal: liefhebbers van staal — Cortemo',
    service: 'Service, levering & voorwaarden — Cortemo',
    admin: 'Beheer — Cortemo',
  }
  const descriptions: Partial<Record<View, string>> = {
    root: 'Cortenstaal op maat: plantenbakken, keerwanden, borderranden en schuttingen. Ontwerp in 3D, zie direct de prijs en ontvang binnen 15 werkdagen.',
    list: group ? group.label + ': ' + group.sub + '. Naadloos gelast cortenstaal, vaste prijzen.' : undefined,
    pdp: product ? product.name + ' — ' + product.desc : undefined,
    inspiratie: 'Echte tuinen, terrassen en daktuinen met Cortemo cortenstaal. Shop de look of bouw hem na in de configurator.',
    verhaal: 'Roots in Drenthe, jarenlange ervaring in de staalindustrie. Metaalbewerking, lasersnijden, lassen en kanten: alles kunnen we maken.',
    maatwerk: 'Stel je cortenstalen product samen tot op de millimeter en zie direct wat het kost.',
    service:
      'Veelgestelde vragen, levertijden, retourneren en de kern van onze voorwaarden en privacyverklaring.',
  }
  document.title = titles[s.view]
  const setMeta = (name: string, content: string | null) => {
    let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
    if (!content) {
      el?.remove()
      return
    }
    if (!el) {
      el = document.createElement('meta')
      el.name = name
      document.head.appendChild(el)
    }
    el.content = content
  }
  setMeta('description', descriptions[s.view] ?? descriptions.root ?? null)
  setMeta('robots', s.view === 'admin' || s.view === 'checkout' ? 'noindex, nofollow' : null)
}

// Collectiepresentatie uit de lokale cache vóór de eerste render, zodat
// beheerde namen/beelden zonder flits (en zonder netwerk) zichtbaar zijn.
hydrateCollections(getCollections())

const CART_KEY = 'cortemo-cart'

function readCart(): CartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CART_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function Header({
  count,
  active,
  theme,
  onToggleTheme,
  onHome,
  onInspiration,
  onB2B,
  onStory,
  onConfigurator,
  onOpenCart,
}: {
  count: number
  active: string
  theme: ReturnType<typeof useTheme>[0]
  onToggleTheme: () => void
  onHome: () => void
  onInspiration: () => void
  onB2B: () => void
  onStory: () => void
  onConfigurator: () => void
  onOpenCart: () => void
}) {
  return (
    <div className="sticky top-3 z-30 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8">
      <CortemoNav
        active={active}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onHome={onHome}
        onInspiration={onInspiration}
        onB2B={onB2B}
        onStory={onStory}
        onConfigurator={onConfigurator}
      />
      <button
        onClick={onOpenCart}
        aria-label={'Open winkelwagen, ' + count + ' artikelen'}
        className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/60 text-ink shadow-sm backdrop-blur-md transition-colors hover:bg-white/80"
      >
        <ShoppingCart size={17} strokeWidth={2} />
        {count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
      </button>
    </div>
  )
}

export function App() {
  const [theme, toggleTheme] = useTheme()
  const [nav, setNav] = useState<NavState>(stateFromLocation)
  const [items, setItems] = useState<CartItem[]>(readCart)
  const [cartOpen, setCartOpen] = useState(false)

  // Navigatie schrijft naar de history-stack zodat de terugknop en deelbare
  // URL's werken; popstate leest dezelfde parameters weer terug.
  const go = useCallback((next: NavState) => {
    setNav(next)
    history.pushState(null, '', urlFor(next))
  }, [])

  useEffect(() => {
    const onPop = () => setNav(stateFromLocation())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Oude ?page=/?cat=/?product=-links stilletjes omzetten naar het nette pad
  // (cfg-param van de configurator blijft behouden), en onbekende paden
  // canonicaliseren zodat er geen soft-404's onder een eigen URL bestaan.
  useEffect(() => {
    const qs = new URLSearchParams(location.search)
    const canonical = urlFor(stateFromLocation())
    if (qs.has('page') || qs.has('cat') || qs.has('product')) {
      const cfg = qs.get('cfg')
      history.replaceState(null, '', canonical + (cfg ? '?cfg=' + cfg : ''))
      return
    }
    const path = location.pathname.replace(/\/+$/, '') || '/'
    if (path !== canonical) {
      history.replaceState(null, '', canonical + location.search + location.hash)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // titel + meta description per pagina
  useEffect(() => {
    applySeo(nav)
  }, [nav])

  // Catalogus, collecties en tarieven uit de backend laden (no-op zonder
  // configuratie); de lokale collectiecache is bij module-init al toegepast.
  const [, setCatalogVersion] = useState(0)
  useEffect(() => {
    void fetchDbProducts().then((rows) => {
      if (rows) {
        hydrateCatalog(rows)
        setCatalogVersion((v) => v + 1)
      }
    })
    void fetchCollections().then((rows) => {
      hydrateCollections(rows)
      setCatalogVersion((v) => v + 1)
    })
    void fetchPricing()
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [nav.view, nav.groupId, nav.productId])

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(items))
    } catch {
      /* storage may be unavailable */
    }
  }, [items])

  const addItem = (item: Omit<CartItem, 'qty'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === item.key)
      return existing
        ? prev.map((i) => (i.key === item.key ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...item, qty: 1 }]
    })
    setCartOpen(true)
  }

  const setQty = (key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, qty } : i)),
    )
  }

  const openList = (id: GroupId, sub?: string) =>
    go({ ...nav, view: 'list', groupId: id, sub: sub ?? null })
  const openProduct = (id: string) => go({ ...nav, view: 'pdp', productId: id })
  const openPage = (page: Page | 'root') => go({ ...nav, view: page, sub: null })

  const active =
    nav.view === 'inspiratie'
      ? 'Inspiratie'
      : nav.view === 'b2b'
        ? 'Zakelijk'
        : nav.view === 'maatwerk'
          ? 'Configurator'
          : nav.view === 'verhaal'
            ? 'Ons verhaal'
            : 'Assortiment'

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      {/* overflow-clip laat de video-hero netjes langs de afgeronde hoeken
          lopen zonder position:sticky van de navbar te breken */}
      <div className="page-shell min-h-[calc(100vh-24px)] overflow-clip rounded-2xl pb-4 text-white sm:min-h-[calc(100vh-32px)] sm:rounded-3xl md:min-h-[calc(100vh-48px)]">
        <Header
          count={cartCount(items)}
          active={active}
          theme={theme}
          onToggleTheme={toggleTheme}
          onHome={() => openPage('root')}
          onInspiration={() => openPage('inspiratie')}
          onB2B={() => openPage('b2b')}
          onStory={() => openPage('verhaal')}
          onConfigurator={() => openPage('maatwerk')}
          onOpenCart={() => setCartOpen(true)}
        />
        {nav.view === 'root' && (
          <GroupGrid onPick={openList} onConfigurator={() => openPage('maatwerk')} />
        )}
        {nav.view === 'list' && (
          <ProductList
            groupId={nav.groupId}
            initialSub={nav.sub ?? undefined}
            onBack={() => openPage('root')}
            onPick={openProduct}
          />
        )}
        {nav.view === 'pdp' && (
          <ProductDetail
            productId={nav.productId}
            onBack={() => openList(nav.groupId)}
            onAdd={addItem}
            onConfigurator={() => openPage('maatwerk')}
          />
        )}
        {nav.view === 'inspiratie' && <Inspiration onShop={openList} />}
        {nav.view === 'b2b' && (
          <B2BDashboard
            onShop={() => openPage('root')}
            onConfigure={() => openPage('maatwerk')}
            onReorder={(reorderItems) => {
              // regels van een eerdere order terug in de winkelwagen
              setItems((prev) => {
                let next = [...prev]
                for (const item of reorderItems) {
                  const existing = next.find((i) => i.key === item.key)
                  next = existing
                    ? next.map((i) => (i.key === item.key ? { ...i, qty: i.qty + item.qty } : i))
                    : [...next, item]
                }
                return next
              })
              openPage('checkout')
            }}
          />
        )}
        {nav.view === 'maatwerk' && (
          <Configurator onShop={() => openPage('root')} onAdd={addItem} />
        )}
        {nav.view === 'checkout' && (
          <Checkout items={items} onClear={() => setItems([])} onShop={() => openPage('root')} />
        )}
        {nav.view === 'verhaal' && <Story onConfigurator={() => openPage('maatwerk')} />}
        {nav.view === 'service' && <Service />}
        {nav.view === 'admin' && <Admin onExit={() => openPage('root')} />}
        <CartDrawer
          open={cartOpen}
          items={items}
          onClose={() => setCartOpen(false)}
          onSetQty={setQty}
          onRemove={(key) => setQty(key, 0)}
          onAddAccelerator={() => addItem(ACCELERATOR)}
          onCheckout={() => {
            setCartOpen(false)
            openPage('checkout')
          }}
          onBrowse={() => {
            setCartOpen(false)
            openPage('root')
          }}
        />
      </div>
      <CortemoFooter />
    </div>
  )
}
