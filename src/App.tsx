import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { CortemoNav } from './components/CortemoNav'
import { CortemoFooter } from './components/CortemoFooter'
import { CartDrawer } from './components/CartDrawer'
import { GroupGrid } from './views/GroupGrid'
import { ProductList } from './views/ProductList'
import { ProductDetail } from './views/ProductDetail'
import { Inspiration } from './views/Inspiration'
import { B2BDashboard } from './views/B2BDashboard'
import { GROUPS, PRODUCTS, type GroupId } from './data/catalog'
import { ACCELERATOR, cartCount, type CartItem } from './lib/cart'
import { useTheme } from './lib/useTheme'

type View = 'root' | 'list' | 'pdp' | 'inspiratie' | 'b2b'

function Header({
  count,
  active,
  theme,
  onToggleTheme,
  onHome,
  onInspiration,
  onOpenCart,
}: {
  count: number
  active: string
  theme: ReturnType<typeof useTheme>[0]
  onToggleTheme: () => void
  onHome: () => void
  onInspiration: () => void
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

  const qs = new URLSearchParams(location.search)
  const catParam = qs.get('cat')
  const productParam = qs.get('product')
  const pageParam = qs.get('page')
  const initGroup = GROUPS.some((g) => g.id === catParam) ? (catParam as GroupId) : null
  const initProduct = PRODUCTS.some((p) => p.id === productParam) ? productParam : null
  const initPage = pageParam === 'inspiratie' || pageParam === 'b2b' ? pageParam : null

  const [view, setView] = useState<View>(
    initProduct ? 'pdp' : initGroup ? 'list' : initPage || 'root',
  )
  const [groupId, setGroupId] = useState<GroupId>(
    initProduct ? PRODUCTS.find((p) => p.id === initProduct)!.group : initGroup || 'planten',
  )
  const [productId, setProductId] = useState<string>(initProduct || PRODUCTS[0].id)
  const [items, setItems] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, groupId, productId])

  const addItem = (item: Omit<CartItem, 'qty'>) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.key === item.key)
      return existing
        ? prev.map((i) => (i.key === item.key ? { ...i, qty: i.qty + 1 } : i))
        : [...prev, { ...item, qty: 1 }]
    })
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  const setQty = (key: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((i) => i.key !== key)
        : prev.map((i) => (i.key === key ? { ...i, qty } : i)),
    )
  }

  const openList = (id: GroupId) => {
    setGroupId(id)
    setView('list')
  }

  const active =
    view === 'inspiratie' ? 'Inspiratie' : view === 'b2b' ? 'B2B portal' : 'Assortiment'

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      <div className="page-shell min-h-[calc(100vh-24px)] rounded-2xl pb-4 text-white sm:min-h-[calc(100vh-32px)] sm:rounded-3xl md:min-h-[calc(100vh-48px)]">
        <Header
          count={cartCount(items)}
          active={active}
          theme={theme}
          onToggleTheme={toggleTheme}
          onHome={() => setView('root')}
          onInspiration={() => setView('inspiratie')}
          onOpenCart={() => setCartOpen(true)}
        />
        {view === 'root' && <GroupGrid onPick={openList} />}
        {view === 'list' && (
          <ProductList
            groupId={groupId}
            onBack={() => setView('root')}
            onPick={(id) => {
              setProductId(id)
              setView('pdp')
            }}
          />
        )}
        {view === 'pdp' && (
          <ProductDetail productId={productId} onBack={() => setView('list')} onAdd={addItem} />
        )}
        {view === 'inspiratie' && <Inspiration onShop={openList} />}
        {view === 'b2b' && <B2BDashboard onShop={() => setView('root')} />}
        {toast && (
          <div className="toast fixed bottom-6 left-1/2 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            Toegevoegd aan winkelwagen
          </div>
        )}
        <CartDrawer
          open={cartOpen}
          items={items}
          onClose={() => setCartOpen(false)}
          onSetQty={setQty}
          onRemove={(key) => setQty(key, 0)}
          onAddAccelerator={() => addItem(ACCELERATOR)}
          onBrowse={() => {
            setCartOpen(false)
            setView('root')
          }}
        />
      </div>
      <CortemoFooter />
    </div>
  )
}
