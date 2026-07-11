import { useState } from 'react'
import { Check, PenLine, Star } from 'lucide-react'
import { reviewsFor, reviewStats, submitReview, useReviews, type Review } from '../lib/reviews'

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={value + ' van 5 sterren'}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.5}
          className={i <= Math.round(value) ? 'fill-[#D95A2B] text-[#D95A2B]' : 'text-white/25'}
        />
      ))}
    </span>
  )
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <figure className="liquid-glass flex h-full flex-col gap-2.5 rounded-2xl p-5 text-white">
      <Stars value={review.rating} />
      <figcaption className="text-[14px] font-bold leading-snug">{review.title}</figcaption>
      <blockquote className="flex-1 text-[13px] leading-relaxed text-white/60">
        &ldquo;{review.body}&rdquo;
      </blockquote>
      <div className="text-[12px] font-semibold text-white/45">
        {review.name} &middot; {review.city}
      </div>
    </figure>
  )
}

/** Homepage-strook: gemiddelde score + recente ervaringen. */
export function ReviewStrip() {
  const reviews = useReviews()
  const { avg, count } = reviewStats(reviews)
  if (count === 0) return null
  return (
    <section className="mx-auto max-w-6xl px-4 pb-14 pt-2 sm:px-6" aria-label="Klantervaringen">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-[.2em] text-rust">
            Klantervaringen
          </p>
          <h2 className="serif mt-2 text-[26px] leading-[1.05] tracking-[-.02em] text-white sm:text-[32px]">
            Klanten geven ons een <span className="italic">{avg.toLocaleString('nl-NL')}</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 text-[13px] text-white/60">
          <Stars value={avg} size={16} />
          <span>
            {avg.toLocaleString('nl-NL')} / 5 &middot; {count} reviews
          </span>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reviews.slice(0, 3).map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
    </section>
  )
}

const field =
  'w-full rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-[16px] font-medium text-white outline-none transition placeholder:text-white/30 focus:border-rust sm:text-[13px]'

function ReviewForm({ productId, onDone }: { productId: string; onDone: () => void }) {
  const [form, setForm] = useState({ name: '', city: '', rating: 5, title: '', body: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const send = async () => {
    if (busy) return
    setBusy(true)
    setError('')
    const result = await submitReview({ productId, ...form })
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'Er ging iets mis.')
      return
    }
    onDone()
  }

  return (
    <div className="space-y-3 rounded-xl bg-white/5 p-4">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-white">
        Jouw beoordeling
        <span className="inline-flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              onClick={() => setForm((f) => ({ ...f, rating: i }))}
              aria-label={i + ' sterren'}
              className="p-0.5"
            >
              <Star
                size={18}
                strokeWidth={1.5}
                className={i <= form.rating ? 'fill-[#D95A2B] text-[#D95A2B]' : 'text-white/30'}
              />
            </button>
          ))}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          type="text"
          placeholder="Naam"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          aria-label="Naam"
          className={field}
        />
        <input
          type="text"
          placeholder="Woonplaats (optioneel)"
          value={form.city}
          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
          aria-label="Woonplaats"
          className={field}
        />
      </div>
      <input
        type="text"
        placeholder="Titel van je review"
        value={form.title}
        onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
        aria-label="Titel van je review"
        className={field}
      />
      <textarea
        placeholder="Wat vond je van het product en de service?"
        value={form.body}
        onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
        rows={3}
        aria-label="Je review"
        className={field + ' resize-y'}
      />
      {error && <p className="text-[12px] font-medium text-rust">{error}</p>}
      <button
        onClick={() => void send()}
        disabled={busy}
        className="rounded-xl bg-rust px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-rust-deep disabled:opacity-60"
      >
        {busy ? 'Versturen…' : 'Review versturen'}
      </button>
    </div>
  )
}

/** PDP-blok: reviews van dit product + inzendformulier. */
export function ReviewBlock({ productId }: { productId: string }) {
  const reviews = useReviews()
  const own = reviewsFor(reviews, productId)
  const shown = own.length > 0 ? own : reviews.filter((r) => r.productId === '')
  const stats = reviewStats(own.length > 0 ? own : reviews)
  const [showAll, setShowAll] = useState(false)
  const [writing, setWriting] = useState(false)
  const [sent, setSent] = useState(false)
  const list = showAll ? shown : shown.slice(0, 2)

  return (
    <section className="mt-10" aria-label="Reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-[18px] font-bold text-white">
          Reviews
          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-white/60">
            <Stars value={stats.avg} />
            {stats.avg.toLocaleString('nl-NL')} / 5
            {own.length > 0 ? ` · ${own.length} voor dit product` : ' · winkelbreed'}
          </span>
        </h2>
        {!writing && !sent && (
          <button
            onClick={() => setWriting(true)}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-white/15"
          >
            <PenLine size={14} strokeWidth={2} /> Schrijf een review
          </button>
        )}
      </div>

      {sent && (
        <p className="mt-4 flex items-center gap-2 rounded-xl bg-ok/15 px-4 py-3 text-[13px] font-semibold text-ok">
          <Check size={15} strokeWidth={2} /> Bedankt! Na een korte check verschijnt je review
          online.
        </p>
      )}
      {writing && !sent && (
        <div className="mt-4">
          <ReviewForm
            productId={productId}
            onDone={() => {
              setWriting(false)
              setSent(true)
            }}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {list.map((r) => (
          <ReviewCard key={r.id} review={r} />
        ))}
      </div>
      {shown.length > 2 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-4 text-[13px] font-semibold text-rust transition-colors hover:text-white"
        >
          {showAll ? 'Toon minder' : `Toon alle ${shown.length} reviews`}
        </button>
      )}
    </section>
  )
}
