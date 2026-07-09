import { useEffect, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { CortemoNav } from './components/CortemoNav'
import { CortemoFooter } from './components/CortemoFooter'
import { GroupGrid } from './views/GroupGrid'
import { ProductList } from './views/ProductList'
import { ProductDetail } from './views/ProductDetail'
import { GROUPS, PRODUCTS, type GroupId } from './data/catalog'
import { useTheme } from './lib/useTheme'

type View = 'root' | 'list' | 'pdp'

function Header({
  cartCount,
  theme,
  onToggleTheme,
  onHome,
}: {
  cartCount: number
  theme: ReturnType<typeof useTheme>[0]
  onToggleTheme: () => void
  onHome: () => void
}) {
  return (
    <div className="sticky top-3 z-30 flex items-start justify-between gap-3 px-4 pt-4 sm:px-6 sm:pt-6 md:px-8 md:pt-8">
      <CortemoNav active="Assortiment" theme={theme} onToggleTheme={onToggleTheme} onHome={onHome} />
      <span className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-white/60 text-ink shadow-sm backdrop-blur-md">
        <ShoppingCart size={17} strokeWidth={2} />
        {cartCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rust px-1 text-[10px] font-bold text-white">
            {cartCount}
          </span>
        )}
      </span>
    </div>
  )
}

export function App() {
  const [theme, toggleTheme] = useTheme()

  const qs = new URLSearchParams(location.search)
  const catParam = qs.get('cat')
  const productParam = qs.get('product')
  const initGroup = GROUPS.some((g) => g.id === catParam) ? (catParam as GroupId) : null
  const initProduct = PRODUCTS.some((p) => p.id === productParam) ? productParam : null

  const [view, setView] = useState<View>(initProduct ? 'pdp' : initGroup ? 'list' : 'root')
  const [groupId, setGroupId] = useState<GroupId>(
    initProduct ? PRODUCTS.find((p) => p.id === initProduct)!.group : initGroup || 'planten',
  )
  const [productId, setProductId] = useState<string>(initProduct || PRODUCTS[0].id)
  const [cartCount, setCartCount] = useState(0)
  const [toast, setToast] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [view, groupId, productId])

  const onAdd = () => {
    setCartCount((c) => c + 1)
    setToast(true)
    setTimeout(() => setToast(false), 2200)
  }

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4 md:p-6">
      <div className="page-shell min-h-[calc(100vh-24px)] rounded-2xl pb-4 text-white sm:min-h-[calc(100vh-32px)] sm:rounded-3xl md:min-h-[calc(100vh-48px)]">
        <Header
          cartCount={cartCount}
          theme={theme}
          onToggleTheme={toggleTheme}
          onHome={() => setView('root')}
        />
        {view === 'root' && (
          <GroupGrid
            onPick={(id) => {
              setGroupId(id)
              setView('list')
            }}
          />
        )}
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
          <ProductDetail productId={productId} onBack={() => setView('list')} onAdd={onAdd} />
        )}
        {toast && (
          <div className="toast fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-white shadow-lg">
            Toegevoegd aan winkelwagen
          </div>
        )}
      </div>
      <CortemoFooter />
    </div>
  )
}
