import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import type { CartItem } from '../lib/cart'

// De 3D-configurator (three.js) wordt lazy geladen zodat de webshop zelf
// geen zware bundle meesleept; deze chunk laadt pas op de maatwerkpagina.
const Configurator3D = lazy(() => import('../components/Configurator3D'))

export function Configurator({ onAdd }: { onAdd: (item: Omit<CartItem, 'qty'>) => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 sm:pt-10 lg:pb-20">
      <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
        3D Maatwerk Configurator
      </p>
      <h1 className="serif mt-3 max-w-3xl text-[30px] leading-[1.0] tracking-[-.03em] text-white sm:mt-4 sm:text-[40px] md:text-[52px]">
        Jouw maat, <em className="text-white/50">ons staal.</em>
      </h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-white/60 sm:mt-4 sm:text-[15px]">
        Stel je product samen tot op de millimeter en zie direct wat het kost.{' '}
        <span className="hidden sm:inline">
          Draai, zoom in op de naad en bekijk hoe het cortenstaal verkleurt van gewalst staal tot
          een diepe roestlaag.
        </span>
      </p>

      <div className="mt-5 sm:mt-8">
        <Suspense
          fallback={
            <div className="liquid-glass flex h-[52vh] min-h-[340px] items-center justify-center rounded-2xl text-white/50 lg:h-[600px]">
              <Loader2 size={18} strokeWidth={2} className="mr-2 animate-spin" /> 3D-configurator
              laden…
            </div>
          }
        >
          <Configurator3D onAdd={onAdd} />
        </Suspense>
      </div>

    </div>
  )
}
