import { Printer, X } from 'lucide-react'
import { euro } from '../data/catalog'
import { VAT_RATE } from '../lib/cart'
import type { Invoice, Order } from '../lib/adminStore'

/**
 * Factuurweergave. Met een vastgelegde factuur (invoice) toont hij het
 * officiële doorlopende nummer en de vastgelegde ordergegevens; zonder is
 * het een proforma op basis van de actuele order. Bewust een licht document
 * op wit — ook in het donkere thema — zodat de printversie (window.print +
 * print-CSS in index.css) er identiek uitziet.
 */
export function InvoiceView({
  order: liveOrder,
  invoice,
  onClose,
}: {
  order: Order
  invoice?: Invoice | null
  onClose: () => void
}) {
  const order = invoice?.order ?? liveOrder
  const exVat = order.total / (1 + VAT_RATE)
  const vat = order.total - exVat

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="invoice-sheet mx-auto max-w-2xl rounded-2xl bg-white p-8 text-[#1F2937] shadow-2xl sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[20px] font-extrabold tracking-[-.03em]">
              CORTEMO<span className="text-[#C14A19]">.</span>
            </div>
            <div className="mt-1 text-[11px] leading-relaxed text-[#6B7280]">
              Staalstraat 12, 5223 AL &rsquo;s-Hertogenbosch
              <br />
              KvK 87654321 &middot; BTW NL003456789B01
              <br />
              hallo@cortemo.nl
            </div>
          </div>
          <div className="flex gap-1 print:hidden">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-[#C14A19] px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110"
            >
              <Printer size={13} strokeWidth={2} /> Print / PDF
            </button>
            <button
              onClick={onClose}
              aria-label="Sluit factuur"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-black/5"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[.14em] text-[#9CA3AF]">
              Factuur aan
            </div>
            <div className="mt-1 text-[14px] font-bold">{order.name}</div>
            <div className="text-[12px] text-[#6B7280]">
              {order.address || order.city}
              <br />
              {order.email}
            </div>
          </div>
          <div className="text-right text-[12px] text-[#6B7280]">
            {!invoice && (
              <div className="mb-1 inline-block rounded bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[.1em] text-[#92400E]">
                Proforma
              </div>
            )}
            <div>
              <span className="font-semibold text-[#1F2937]">Factuurnummer:</span>{' '}
              {invoice ? invoice.id : 'P-' + order.id}
            </div>
            <div>
              <span className="font-semibold text-[#1F2937]">Ordernummer:</span> {order.id}
            </div>
            <div>
              <span className="font-semibold text-[#1F2937]">Datum:</span>{' '}
              {new Date(invoice?.date ?? order.date).toLocaleDateString('nl-NL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
        <table className="mt-8 w-full min-w-[400px] text-[13px]">
          <thead>
            <tr className="border-b-2 border-[#1F2937] text-left text-[11px] font-semibold uppercase tracking-[.08em] text-[#6B7280]">
              <th className="pb-2">Omschrijving</th>
              <th className="pb-2 text-right">Aantal</th>
              <th className="pb-2 text-right">Stukprijs excl.</th>
              <th className="pb-2 text-right">Bedrag excl.</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => {
              const unitEx = item.unitPrice / (1 + VAT_RATE)
              return (
                <tr key={i} className="border-b border-[#E5E7EB] align-top">
                  <td className="py-2.5">
                    <span className="font-semibold">{item.name}</span>
                    {item.config?.length > 0 && (
                      <span className="block text-[11px] text-[#6B7280]">
                        {item.config.join(' · ')}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-right tabular-nums">{item.qty}</td>
                  <td className="py-2.5 text-right tabular-nums">{euro(unitEx)}</td>
                  <td className="py-2.5 text-right tabular-nums">{euro(unitEx * item.qty)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        <div className="mt-4 ml-auto w-64 space-y-1 text-[13px]">
          {order.discountAmount > 0 && (
            <div className="flex justify-between text-[#6B7280]">
              <span>Korting {order.discountCode && `(${order.discountCode})`}</span>
              <span className="tabular-nums">−{euro(order.discountAmount / (1 + VAT_RATE))}</span>
            </div>
          )}
          <div className="flex justify-between text-[#6B7280]">
            <span>Subtotaal excl. btw</span>
            <span className="tabular-nums">{euro(exVat)}</span>
          </div>
          <div className="flex justify-between text-[#6B7280]">
            <span>Btw 21%</span>
            <span className="tabular-nums">{euro(vat)}</span>
          </div>
          <div className="flex justify-between border-t-2 border-[#1F2937] pt-1.5 text-[15px] font-extrabold">
            <span>Totaal</span>
            <span className="tabular-nums">{euro(order.total)}</span>
          </div>
        </div>

        <p className="mt-8 text-[11px] leading-relaxed text-[#9CA3AF]">
          Betaling binnen 14 dagen onder vermelding van het factuurnummer op NL00 BANK 0123 4567
          89 t.n.v. Cortemo. Vragen over deze factuur? Mail hallo@cortemo.nl.
        </p>
      </div>
    </div>
  )
}
