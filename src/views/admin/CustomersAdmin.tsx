import { FileText } from 'lucide-react'
import { euro } from '../../data/catalog'
import { deriveCustomers, type Order } from '../../lib/adminStore'
import { Card, EmptyRow, fmtDate } from './ui'
import type { OfferDraft } from './OffersAdmin'

/** Klantenlijst, afgeleid uit de orders (CRM-lite). */
export function CustomersAdmin({
  orders,
  onOffer,
}: {
  orders: Order[]
  onOffer: (draft: OfferDraft) => void
}) {
  const customers = deriveCustomers(orders)
  return (
    <Card title="Klanten" aside={<span className="text-[12px] text-white/40">{customers.length} uniek</span>}>
      {customers.length === 0 ? (
        <EmptyRow>Nog geen klanten; ze verschijnen hier zodra er orders binnenkomen.</EmptyRow>
      ) : (
        <ul className="divide-y divide-white/5">
          {customers.map((c) => (
            <li key={c.email} className="flex flex-wrap items-center gap-3 py-3.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{c.name}</span>
                <span className="block truncate text-[11px] text-white/45">{c.email}</span>
              </span>
              <span className="text-[12px] text-white/50">
                {c.orders} order{c.orders === 1 ? '' : 's'} · laatste {fmtDate(c.lastOrder)}
              </span>
              <span className="text-[13px] font-bold tabular-nums">{euro(c.revenue)}</span>
              <button
                onClick={() => onOffer({ customer: c.name, email: c.email })}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-2 text-[12px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
              >
                <FileText size={12} strokeWidth={2} /> Nieuwe offerte
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
