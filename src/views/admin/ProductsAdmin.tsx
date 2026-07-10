import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { euro, GROUPS, hydrateCatalog, PRODUCTS } from '../../data/catalog'
import {
  deleteProduct,
  fetchDbProducts,
  hasBackend,
  insertProduct,
  updateProductFull,
  type DbProduct,
} from '../../lib/adminStore'
import { Card, EmptyRow, fieldSm, PrimaryButton } from './ui'

type Draft = Omit<DbProduct, 'variants' | 'options'> & {
  variants: [string, number][]
  options: [string, number][]
}

const emptyDraft = (): Draft => ({
  id: '',
  group_id: GROUPS[0].id,
  sub: '',
  name: '',
  dims: '',
  img: '',
  price: 100,
  descr: '',
  variants: [['Standaard', 0]],
  options: [],
  leadtime: '',
  stock: null,
})

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/** Regelseditor voor varianten en opties: [label, meerprijs]. */
function PairsEditor({
  label,
  pairs,
  onChange,
}: {
  label: string
  pairs: [string, number][]
  onChange: (next: [string, number][]) => void
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-white/70">{label}</span>
        <button
          onClick={() => onChange([...pairs, ['', 0]])}
          className="flex items-center gap-1 text-[12px] font-semibold text-white/50 hover:text-white"
        >
          <Plus size={12} strokeWidth={2} /> regel
        </button>
      </div>
      <div className="space-y-1.5">
        {pairs.map(([text, price], i) => (
          <div key={i} className="flex items-center gap-1.5">
            <input
              type="text"
              value={text}
              placeholder="Omschrijving"
              onChange={(e) =>
                onChange(pairs.map((p, j) => (j === i ? [e.target.value, p[1]] : p)))
              }
              className={fieldSm + ' min-w-0 flex-1'}
            />
            <span className="relative">
              <input
                type="number"
                value={price}
                onChange={(e) =>
                  onChange(pairs.map((p, j) => (j === i ? [p[0], +e.target.value] : p)))
                }
                className={fieldSm + ' w-24 pl-6 text-right tabular-nums'}
              />
              <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-white/40">
                +€
              </span>
            </span>
            <button
              onClick={() => onChange(pairs.filter((_, j) => j !== i))}
              aria-label="Verwijder regel"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white"
            >
              <Trash2 size={13} strokeWidth={2} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Editor({
  initial,
  onDone,
  onCancel,
}: {
  initial: Draft
  onDone: () => void
  onCancel: () => void
}) {
  const [d, setD] = useState<Draft>(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const isNew = !initial.id
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setD((prev) => ({ ...prev, [key]: value }))

  const save = async () => {
    if (!d.name.trim() || d.price <= 0) {
      setError('Naam en een prijs boven nul zijn verplicht.')
      return
    }
    setBusy(true)
    setError('')
    const payload: DbProduct = {
      ...d,
      id: d.id || slug(d.name) + (PRODUCTS.some((p) => p.id === slug(d.name)) ? '-' + String(Date.now()).slice(-4) : ''),
      variants: d.variants.filter(([t]) => t.trim()),
      options: d.options.filter(([t]) => t.trim()),
    }
    const result = isNew
      ? await insertProduct(payload)
      : await updateProductFull(payload.id, payload)
    setBusy(false)
    if (!result.ok) {
      setError(result.error || 'Opslaan mislukt.')
      return
    }
    const rows = await fetchDbProducts()
    if (rows) hydrateCatalog(rows)
    onDone()
  }

  return (
    <div className="space-y-4 rounded-xl bg-white/5 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Naam</span>
          <input type="text" value={d.name} onChange={(e) => set('name', e.target.value)} className={fieldSm + ' w-full'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Collectie</span>
          <select
            value={d.group_id}
            onChange={(e) => set('group_id', e.target.value)}
            className={fieldSm + ' w-full'}
            style={{ colorScheme: 'dark' }}
          >
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id} style={{ backgroundColor: '#14191E' }}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Subcategorie</span>
          <input type="text" value={d.sub} onChange={(e) => set('sub', e.target.value)} className={fieldSm + ' w-full'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Afmeting (weergave)</span>
          <input type="text" value={d.dims} placeholder="bijv. 60 × 60 × 60 cm" onChange={(e) => set('dims', e.target.value)} className={fieldSm + ' w-full'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Vanafprijs (€ incl. btw)</span>
          <input type="number" value={d.price} onChange={(e) => set('price', +e.target.value)} className={fieldSm + ' w-full tabular-nums'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Afbeeldings-URL</span>
          <input type="text" value={d.img} placeholder="/img/naam.jpg" onChange={(e) => set('img', e.target.value)} className={fieldSm + ' w-full'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">Levertijd</span>
          <input type="text" value={d.leadtime} placeholder="bijv. 5 tot 8 werkdagen" onChange={(e) => set('leadtime', e.target.value)} className={fieldSm + ' w-full'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] font-semibold text-white/70">
            Voorraad <span className="font-normal text-white/40">(leeg = altijd leverbaar, 0 = uitverkocht)</span>
          </span>
          <input
            type="number"
            min={0}
            value={d.stock ?? ''}
            onChange={(e) => set('stock', e.target.value === '' ? null : Math.max(0, +e.target.value))}
            className={fieldSm + ' w-full tabular-nums'}
          />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[12px] font-semibold text-white/70">Omschrijving</span>
        <textarea rows={2} value={d.descr} onChange={(e) => set('descr', e.target.value)} className={fieldSm + ' w-full resize-none'} />
      </label>
      <PairsEditor label="Afmetingsvarianten" pairs={d.variants} onChange={(v) => set('variants', v)} />
      <PairsEditor label="Opties" pairs={d.options} onChange={(v) => set('options', v)} />
      {error && <p className="text-[13px] font-medium text-rust">{error}</p>}
      <div className="flex gap-2">
        <PrimaryButton onClick={() => void save()} disabled={busy}>
          {busy ? 'Bezig…' : isNew ? 'Product aanmaken' : 'Wijzigingen opslaan'}
        </PrimaryButton>
        <button onClick={onCancel} className="rounded-xl bg-white/5 px-5 py-2.5 text-[14px] font-semibold text-white/70 hover:bg-white/10 hover:text-white">
          Annuleren
        </button>
      </div>
    </div>
  )
}

export function ProductsAdmin() {
  const [editing, setEditing] = useState<string | null>(null) // product-id of 'nieuw'
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [, bump] = useState(0)
  const refresh = () => bump((v) => v + 1)

  const remove = async (id: string) => {
    const result = await deleteProduct(id)
    if (result.ok) {
      const rows = await fetchDbProducts()
      if (rows) hydrateCatalog(rows)
    }
    setConfirmDelete(null)
    refresh()
  }

  const toDraft = (id: string): Draft => {
    const p = PRODUCTS.find((x) => x.id === id)!
    return {
      id: p.id,
      group_id: p.group,
      sub: p.sub,
      name: p.name,
      dims: p.dims,
      img: p.img,
      price: p.price,
      descr: p.desc,
      variants: [...p.variants],
      options: [...p.options],
      leadtime: p.leadtime ?? '',
      stock: p.stock ?? null,
    }
  }

  if (!hasBackend) {
    return (
      <Card title="Producten">
        <EmptyRow>
          Productbeheer vereist de gekoppelde database. Zet VITE_SUPABASE_URL en -KEY (zie
          .env.example) en dit scherm wordt volledig bewerkbaar.
        </EmptyRow>
      </Card>
    )
  }

  return (
    <Card
      title="Producten"
      aside={
        editing === null ? (
          <button
            onClick={() => setEditing('nieuw')}
            className="flex items-center gap-1.5 rounded-lg bg-rust px-3 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep"
          >
            <Plus size={13} strokeWidth={2} /> Nieuw product
          </button>
        ) : undefined
      }
    >
      {editing === 'nieuw' && (
        <div className="mb-4">
          <Editor initial={emptyDraft()} onDone={() => { setEditing(null); refresh() }} onCancel={() => setEditing(null)} />
        </div>
      )}
      <ul className="divide-y divide-white/5">
        {PRODUCTS.map((p) => (
          <li key={p.id} className="py-2.5">
            <div className="flex items-center gap-3 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-semibold">{p.name}</span>
              <span className="hidden text-white/45 sm:block">{p.sub}</span>
              <span className="font-bold tabular-nums">{euro(p.price)}</span>
              <button
                onClick={() => setEditing(editing === p.id ? null : p.id)}
                aria-label={'Bewerk ' + p.name}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
              >
                <Pencil size={14} strokeWidth={2} />
              </button>
              {confirmDelete === p.id ? (
                <button
                  onClick={() => void remove(p.id)}
                  className="rounded-lg bg-rust px-2.5 py-2 text-[12px] font-semibold text-white hover:bg-rust-deep"
                >
                  Zeker?
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(p.id)}
                  onBlur={() => setConfirmDelete(null)}
                  aria-label={'Verwijder ' + p.name}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-rust"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </div>
            {editing === p.id && (
              <div className="mt-3">
                <Editor initial={toDraft(p.id)} onDone={() => { setEditing(null); refresh() }} onCancel={() => setEditing(null)} />
              </div>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-white/40">
        Wijzigingen gaan direct de database in en zijn meteen zichtbaar in de shop.
      </p>
    </Card>
  )
}
