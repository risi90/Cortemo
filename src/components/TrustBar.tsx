import { Factory, MessageCircle, ShieldCheck, Square, Truck } from 'lucide-react'

/** WhatsApp-advieslijn (dummy-nummer tot het echte zakelijke nummer er is). */
export const WHATSAPP_URL = 'https://wa.me/31612345678'
export const whatsappShare = (text: string) => WHATSAPP_URL + '?text=' + encodeURIComponent(text)

const ITEMS: { icon: typeof ShieldCheck; title: string; sub: string; href?: string }[] = [
  { icon: ShieldCheck, title: '5 jaar garantie', sub: 'op constructie en laswerk' },
  { icon: Factory, title: 'Eigen productie', sub: 'lasersnijden en lassen in NL' },
  { icon: Truck, title: 'Levering NL & BE', sub: 'chauffeur belt vooraf' },
  { icon: Square, title: 'Gratis proefstuk', sub: 'zie en voel het staal eerst', href: '/product/proefstuk' },
]

/** Vertrouwensstrook: de vier beloften die overal terugkomen. */
export function TrustBar({ className = '' }: { className?: string }) {
  return (
    <div
      className={
        'grid grid-cols-2 gap-3 rounded-2xl bg-white/5 p-4 text-white sm:grid-cols-4 sm:gap-4 sm:p-5 ' +
        className
      }
    >
      {ITEMS.map(({ icon: Icon, title, sub, href }) => {
        const inner = (
          <span className="flex items-start gap-2.5">
            <Icon size={17} strokeWidth={2} className="mt-0.5 shrink-0 text-rust" />
            <span>
              <span className="block text-[12.5px] font-bold leading-tight">{title}</span>
              <span className="block text-[11.5px] leading-snug text-white/50">{sub}</span>
            </span>
          </span>
        )
        return href ? (
          <a key={title} href={href} className="transition-opacity hover:opacity-80">
            {inner}
          </a>
        ) : (
          <span key={title}>{inner}</span>
        )
      })}
    </div>
  )
}

/** Adviesblok: laagdrempelig contact over een product of ontwerp. */
export function AdviceCard({ context }: { context?: string }) {
  const msg = context
    ? `Hoi Cortemo! Ik heb een vraag over: ${context}`
    : 'Hoi Cortemo! Ik heb een vraag over jullie cortenstaal.'
  return (
    <div className="liquid-glass mt-4 flex flex-wrap items-center gap-4 rounded-2xl p-5 text-white">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-rust">
        <MessageCircle size={18} strokeWidth={2} />
      </span>
      <span className="min-w-0 flex-1 basis-48">
        <span className="block text-[14px] font-semibold">Twijfel je over maat of plaatsing?</span>
        <span className="block text-[12px] text-white/70">
          App of mail ons — we denken gratis mee, ook met een schets of foto.
        </span>
      </span>
      <span className="flex shrink-0 gap-2">
        <a
          href={whatsappShare(msg)}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl bg-[#25D366]/90 px-3.5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
        >
          WhatsApp
        </a>
        <a
          href={'mailto:hallo@cortemo.nl?subject=' + encodeURIComponent('Advies: ' + (context ?? 'cortenstaal'))}
          className="rounded-xl bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/15"
        >
          Mail ons
        </a>
      </span>
    </div>
  )
}
