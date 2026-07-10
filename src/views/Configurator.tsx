import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, FileUp, Ruler, ShieldCheck, Truck } from 'lucide-react'

const TYPES = [
  'Plantenbak',
  'Keerwand',
  'Borderrand',
  'Vijverrand',
  'Schutting',
  'Vuurschaal',
  'Anders',
]

const THICKNESS = ['2 mm', '3 mm (aanbevolen)', '4 mm', '5 mm']

const USPS: [typeof Ruler, string, string][] = [
  [Ruler, 'Tot op de millimeter', 'Elke maat is mogelijk; wij tekenen het voor je uit.'],
  [ShieldCheck, 'Naadloos gelast', '3 mm cortenstaal, gelast en geslepen in eigen werkplaats.'],
  [Truck, 'Binnen 15 werkdagen', 'Maatwerk geleverd door heel Nederland en België.'],
]

const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[14px]'

function Select({
  value,
  onChange,
  options,
  label,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
  label: string
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={field + ' appearance-none pr-10'}
        style={{ colorScheme: 'dark' }}
      >
        {options.map((o) => (
          <option key={o} value={o} style={{ backgroundColor: '#14191E' }}>
            {o}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/40">
        <ChevronDown size={14} strokeWidth={2} />
      </span>
    </div>
  )
}

export function Configurator({ onShop }: { onShop: () => void }) {
  const [sent, setSent] = useState(false)
  const [tried, setTried] = useState(false)
  const [form, setForm] = useState({
    type: TYPES[0],
    l: '',
    b: '',
    h: '',
    dikte: THICKNESS[1],
    file: '',
    note: '',
    name: '',
    email: '',
  })
  const set = (key: keyof typeof form) => (value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const valid =
    form.name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(form.email) &&
    (form.l || form.b || form.h || form.file)

  const submit = () => {
    setTried(true)
    if (valid) setSent(true)
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-16">
      <div className="flex flex-col gap-10 lg:flex-row lg:gap-14">
        {/* intro + usp's */}
        <div className="lg:max-w-md">
          <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
            Maatwerk Configurator
          </p>
          <h1 className="serif mt-5 text-[34px] leading-[1.0] tracking-[-.03em] text-white sm:text-[40px] md:text-[52px]">
            Jouw maat, <em className="text-white/50">ons staal.</em>
          </h1>
          <p className="mt-5 text-[15px] leading-relaxed text-white/60">
            Vertel ons wat je nodig hebt en ontvang binnen één werkdag een offerte op maat,
            inclusief technische tekening. De interactieve 3D-configurator is in ontwikkeling; tot
            die tijd calculeren onze staalbouwers elke aanvraag persoonlijk.
          </p>
          <ul className="mt-8 space-y-5">
            {USPS.map(([Icon, title, sub]) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-rust">
                  <Icon size={18} strokeWidth={2} />
                </span>
                <span>
                  <span className="block text-[14px] font-bold text-white">{title}</span>
                  <span className="block text-[13px] leading-relaxed text-white/55">{sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* aanvraagformulier */}
        <div className="min-w-0 flex-1">
          {sent ? (
            <div className="liquid-glass flex flex-col items-start gap-4 rounded-2xl p-6 text-white sm:p-8">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ok text-white">
                <Check size={22} strokeWidth={2} />
              </span>
              <div>
                <h2 className="text-[22px] font-extrabold tracking-[-.02em]">
                  Aanvraag ontvangen
                </h2>
                <p className="mt-2 max-w-md text-[14px] leading-relaxed text-white/60">
                  Bedankt, {form.name.split(' ')[0]}. We hebben je maatwerkaanvraag voor een{' '}
                  {form.type.toLowerCase()} ontvangen. Je ontvangt binnen één werkdag een offerte
                  met technische tekening op {form.email}.
                </p>
              </div>
              <button
                onClick={onShop}
                className="mt-2 flex items-center gap-2 rounded-xl bg-rust px-5 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-rust-deep"
              >
                Verder winkelen <ArrowRight size={15} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <div className="liquid-glass flex flex-col gap-5 rounded-2xl p-6 text-white sm:p-8">
              <div>
                <div className="mb-2 text-[13px] font-semibold">Wat wil je laten maken?</div>
                <Select value={form.type} onChange={set('type')} options={TYPES} label="Producttype" />
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold">Afmetingen (mm)</div>
                <div className="grid grid-cols-3 gap-3">
                  {(
                    [
                      ['l', 'Lengte'],
                      ['b', 'Breedte'],
                      ['h', 'Hoogte'],
                    ] as const
                  ).map(([key, label]) => (
                    <input
                      key={key}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder={label}
                      aria-label={label + ' in millimeters'}
                      value={form[key]}
                      onChange={(e) => set(key)(e.target.value)}
                      className={field}
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-[13px] font-semibold">Staaldikte</div>
                  <Select
                    value={form.dikte}
                    onChange={set('dikte')}
                    options={THICKNESS}
                    label="Staaldikte"
                  />
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-semibold">
                    DXF-tekening <span className="font-normal text-white/40">(optioneel)</span>
                  </div>
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3 text-[13px] text-white/60 transition-colors hover:border-rust hover:text-white">
                    <FileUp size={15} strokeWidth={2} className="shrink-0 text-rust" />
                    <span className="truncate">{form.file || 'Upload je DXF-bestand'}</span>
                    <input
                      type="file"
                      accept=".dxf"
                      className="hidden"
                      onChange={(e) => set('file')(e.target.files?.[0]?.name || '')}
                    />
                  </label>
                </div>
              </div>

              <div>
                <div className="mb-2 text-[13px] font-semibold">
                  Omschrijving <span className="font-normal text-white/40">(optioneel)</span>
                </div>
                <textarea
                  rows={3}
                  placeholder="Bijv. plantenbak met verstek-hoeken, bodemloos, zichtzijde aan twee kanten…"
                  value={form.note}
                  onChange={(e) => set('note')(e.target.value)}
                  className={field + ' resize-none'}
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-[13px] font-semibold">Naam</div>
                  <input
                    type="text"
                    autoComplete="name"
                    placeholder="Voor- en achternaam"
                    value={form.name}
                    onChange={(e) => set('name')(e.target.value)}
                    className={field}
                  />
                </div>
                <div>
                  <div className="mb-2 text-[13px] font-semibold">E-mailadres</div>
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="naam@voorbeeld.nl"
                    value={form.email}
                    onChange={(e) => set('email')(e.target.value)}
                    className={field}
                  />
                </div>
              </div>

              {tried && !valid && (
                <p className="text-[13px] font-medium text-rust">
                  Vul minimaal één afmeting (of een DXF), je naam en een geldig e-mailadres in.
                </p>
              )}

              <button
                onClick={submit}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-rust py-3.5 text-[15px] font-semibold text-white transition-all hover:bg-rust-deep active:scale-[.99]"
              >
                Vraag offerte aan <ArrowRight size={16} strokeWidth={2} />
              </button>
              <p className="text-center text-[12px] text-white/40">
                Vrijblijvend &middot; offerte binnen één werkdag &middot; inclusief technische
                tekening
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
