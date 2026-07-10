import { Download, Printer, X } from 'lucide-react'
import { parseCfg } from '../lib/cfg'
import {
  buigtabel,
  buigtabelCsv,
  downloadFile,
  dxfFor,
  workOrderFor,
  type WorkOrder,
} from '../lib/fabricage'
import type { Order } from '../lib/adminStore'

/**
 * Werkbon voor de fabriek, afgeleid van de maatwerkregels van een order.
 * Per onderdeel: uitslagmaten, DXF-download (lasernesting in Profirst,
 * lagen SNIJDEN/GATEN/ZETLIJN_*) en de buigtabel met aanslagmaten voor de
 * Delem-besturing van de kantbank. Print via window.print (zelfde
 * print-CSS-truc als de factuur: klasse invoice-sheet).
 */
export function WorkOrderView({ order, onClose }: { order: Order; onClose: () => void }) {
  const regels = order.items
    .map((item) => {
      const cfg = item.key?.startsWith('cfg:') ? parseCfg(item.key.slice(4)) : null
      return cfg ? { item, cfg, werk: workOrderFor(cfg) as WorkOrder } : null
    })
    .filter((r): r is NonNullable<typeof r> => r !== null)

  const downloadAll = () => {
    for (const { werk } of regels) {
      for (const part of werk.parts) {
        downloadFile(`${order.id}-${part.id}.dxf`, dxfFor(part, order.id))
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8">
      <div className="invoice-sheet mx-auto max-w-3xl rounded-2xl bg-white p-8 text-[#1F2937] shadow-2xl sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[20px] font-extrabold tracking-[-.03em]">
              CORTEMO<span className="text-[#C14A19]">.</span>{' '}
              <span className="font-semibold text-[#6B7280]">Werkbon</span>
            </div>
            <div className="mt-1 text-[12px] text-[#6B7280]">
              Order <span className="font-semibold text-[#1F2937]">{order.id}</span> ·{' '}
              {new Date(order.date).toLocaleDateString('nl-NL')} · {order.name}
            </div>
          </div>
          <div className="flex gap-1 print:hidden">
            <button
              onClick={downloadAll}
              className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] px-3 py-2 text-[12px] font-semibold text-[#1F2937] hover:border-[#C14A19]"
            >
              <Download size={13} strokeWidth={2} /> Alle DXF&rsquo;s
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg bg-[#C14A19] px-3 py-2 text-[12px] font-semibold text-white hover:brightness-110"
            >
              <Printer size={13} strokeWidth={2} /> Print
            </button>
            <button
              onClick={onClose}
              aria-label="Sluit werkbon"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] hover:bg-black/5"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        </div>

        {regels.length === 0 && (
          <p className="mt-8 text-[13px] text-[#6B7280]">
            Deze order bevat geen maatwerkregels; voor catalogusproducten is geen uitslag nodig.
          </p>
        )}

        {regels.map(({ item, werk }, ri) => (
          <div key={ri} className="mt-8 border-t-2 border-[#1F2937] pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-[15px] font-extrabold">
                {item.qty} × {item.name}
              </h2>
              <span className="text-[11px] text-[#6B7280]">
                Corten A (S355J0WP) · {werk.params.dikte} mm · K-factor {werk.params.kFactor} ·
                binnenradius {werk.params.radius} mm · buigaftrek 90° = {werk.params.buigaftrek90} mm
              </span>
            </div>
            {item.config?.length > 0 && (
              <p className="mt-0.5 text-[12px] text-[#6B7280]">{item.config.join(' · ')}</p>
            )}

            {werk.parts.map((part) => (
              <div key={part.id} className="mt-4 rounded-lg border border-[#E5E7EB] p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[13px] font-bold">
                    {part.naam}{' '}
                    <span className="font-semibold text-[#6B7280]">
                      · {part.aantal * item.qty}× · uitslag {part.breedte} × {part.hoogte} mm ·{' '}
                      {part.dikte} mm
                    </span>
                  </div>
                  <div className="flex gap-1 print:hidden">
                    <button
                      onClick={() => downloadFile(`${order.id}-${part.id}.dxf`, dxfFor(part, order.id))}
                      className="flex items-center gap-1 rounded border border-[#E5E7EB] px-2 py-1 text-[11px] font-semibold hover:border-[#C14A19]"
                    >
                      <Download size={11} strokeWidth={2} /> DXF (Profirst)
                    </button>
                    {part.zetlijnen.length > 0 && (
                      <button
                        onClick={() =>
                          downloadFile(
                            `${order.id}-${part.id}-buigtabel.csv`,
                            buigtabelCsv(part, order.id),
                            'text/csv',
                          )
                        }
                        className="flex items-center gap-1 rounded border border-[#E5E7EB] px-2 py-1 text-[11px] font-semibold hover:border-[#C14A19]"
                      >
                        <Download size={11} strokeWidth={2} /> Buigtabel (Delem)
                      </button>
                    )}
                  </div>
                </div>

                {part.gaten.length > 0 && (
                  <p className="mt-1 text-[12px] text-[#6B7280]">
                    Gaten:{' '}
                    {part.gaten.map((g) => `ø${g.d} op (${g.x}; ${g.y})`).join(' · ')}
                  </p>
                )}

                {part.zetlijnen.length > 0 && (
                  <table className="mt-2 w-full text-[12px]">
                    <thead>
                      <tr className="border-b border-[#E5E7EB] text-left text-[10px] font-semibold uppercase tracking-[.08em] text-[#6B7280]">
                        <th className="py-1 pr-2">#</th>
                        <th className="py-1 pr-2">Zetting</th>
                        <th className="py-1 pr-2 text-right">Aanslagmaat</th>
                        <th className="py-1 pr-2 text-right">Zetlengte</th>
                        <th className="py-1 pr-2 text-right">Hoek</th>
                        <th className="py-1">Richting</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buigtabel(part).map((r) => (
                        <tr key={r.volgorde} className="border-b border-[#F3F4F6]">
                          <td className="py-1 pr-2 tabular-nums">{r.volgorde}</td>
                          <td className="py-1 pr-2">{r.label}</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{r.aanslag} mm</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{r.zetlengte} mm</td>
                          <td className="py-1 pr-2 text-right tabular-nums">{r.hoek}°</td>
                          <td className="py-1">{r.richting}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {part.notities.map((n, i) => (
                  <p key={i} className="mt-1 text-[11px] text-[#92400E]">
                    ▸ {n}
                  </p>
                ))}
              </div>
            ))}

            {werk.notities.map((n, i) => (
              <p key={i} className="mt-2 text-[12px] font-medium text-[#92400E]">
                ▸ {n}
              </p>
            ))}
          </div>
        ))}

        <p className="mt-8 text-[11px] leading-relaxed text-[#9CA3AF]">
          DXF-lagen: SNIJDEN = lasercontour · GATEN = boringen · ZETLIJN_BOVEN/ONDER = zetlijnen
          (niet snijden; bij nesting in Profirst uitsluiten van het snijpad) · INFO = tekst.
          Buigtabellen geven de aanslagmaat vanaf de dichtstbijzijnde uitslagrand; controleer de
          eerste zetting met de vermelde K-factor en radius op de Delem voordat de serie draait.
        </p>
      </div>
    </div>
  )
}
