import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * Klantreviews: gepubliceerde reviews komen uit cortemo_reviews (RLS laat
 * anoniem alleen approved-rijen zien). Zonder bereikbare backend valt de
 * site terug op de startset hieronder — dezelfde inhoud als de databaseseed,
 * zodat de winkel nooit "leeg" oogt. Inzendingen komen ongepubliceerd
 * binnen en worden in het beheer gemodereerd.
 */

export type Review = {
  id: string
  productId: string // '' = algemene winkelreview
  name: string
  city: string
  rating: number
  title: string
  body: string
  date: string
}

const SEED: Review[] = [
  { id: 's1', productId: '', name: 'Marieke v. D.', city: 'Utrecht', rating: 5, title: 'Precies op maat, prachtig verroest', body: 'Configurator werkt verrassend fijn: maten tot op de millimeter en je ziet direct de prijs. De keerwand paste exact tussen de schutting en het terras.', date: '2026-06-28' },
  { id: 's2', productId: '', name: 'R. Jansen', city: 'Eindhoven', rating: 5, title: 'Van tekening tot tuin in twee weken', body: 'Strak laswerk, stevig staal en netjes op pallet geleverd. De chauffeur belde een uur van tevoren.', date: '2026-06-06' },
  { id: 's3', productId: '', name: 'Hoveniersbedrijf Groenzicht', city: 'Zwolle', rating: 5, title: 'Fijne partner voor projecten', body: 'Wij bestellen via het zakelijke portal. Herbestellen per project en facturen op rekening schelen ons echt administratie.', date: '2026-05-10' },
  { id: 's4', productId: 'cubo', name: 'S. de Boer', city: 'Haarlem', rating: 5, title: 'Mooie strakke bak', body: 'Naadloos gelast, geen zichtbare schroeven. Na een zomer heeft hij een prachtige egale roestlaag.', date: '2026-06-20' },
  { id: 's5', productId: 'cubo', name: 'T. Willems', city: 'Breda', rating: 4, title: 'Degelijk, let op de eerste weken', body: 'Topkwaliteit. In het begin geeft de roest wat af op de tegels — met het gratis proefstuk hadden we dat gelukkig al gezien, dus hij staat op grind.', date: '2026-05-23' },
  { id: 's6', productId: 'grande', name: 'Familie Peeters', city: 'Antwerpen', rating: 5, title: 'Enorme bak, strak gebleven', body: 'Drie kuub grond erin en geen bolling te zien. Levering in België verliep vlot.', date: '2026-06-13' },
  { id: 's7', productId: 'lijn', name: 'K. Smit', city: 'Groningen', rating: 5, title: 'Eindelijk strakke borders', body: 'Set van twee met koppelstrips, in een middag gelegd. De grondpennen houden alles muurvast.', date: '2026-06-25' },
  { id: 's8', productId: 'terra', name: 'J. Verhoeven', city: 'Nijmegen', rating: 5, title: 'Hoogteverschil netjes opgelost', body: 'Keerwand van 80 cm hoog, staat als een huis zonder beton. Advies per mail was snel en eerlijk.', date: '2026-05-29' },
  { id: 's9', productId: 'verde', name: 'A. Kuipers', city: 'Amersfoort', rating: 4, title: 'Kweekbak op werkhoogte', body: 'Heerlijk werken zonder bukken en de slakkenrand doet zijn werk. Puntje: lever de bodemdoek-tip uit de FAQ ook bij het product.', date: '2026-05-16' },
  { id: 's10', productId: 'numero', name: 'M. el Amrani', city: 'Rotterdam', rating: 5, title: 'Naambord is echt af', body: 'Tekst zelf gesleept in de 3D-editor tot het klopte, en zo is hij ook exact geleverd. RVS afstandhouders geven mooi diepte-effect.', date: '2026-07-01' },
  { id: 's11', productId: 'vista', name: 'P. Bakker', city: 'Apeldoorn', rating: 5, title: 'Privacy én licht', body: 'Laserpatroon geeft prachtige schaduwen in de avondzon. Verborgen staanders, dus geen palen in het zicht.', date: '2026-05-01' },
  { id: 's12', productId: 'den', name: 'L. Vermeer', city: 'Den Bosch', rating: 5, title: 'Leuk cadeau', body: 'Figuur voor in de border van mijn moeder. Stond binnen tien dagen roestig en wel in de tuin.', date: '2026-06-09' },
]

let cache: Review[] = SEED
let inflight: Promise<Review[]> | null = null

type Row = {
  id: string
  product_id: string
  name: string
  city: string
  rating: number
  title: string
  body: string
  created_at: string
}

const rowToReview = (r: Row): Review => ({
  id: r.id,
  productId: r.product_id,
  name: r.name,
  city: r.city,
  rating: Number(r.rating),
  title: r.title,
  body: r.body,
  date: String(r.created_at).slice(0, 10),
})

export function fetchReviews(): Promise<Review[]> {
  if (!supabase) return Promise.resolve(cache)
  inflight ??= (async () => {
    try {
      const { data, error } = await supabase
        .from('cortemo_reviews')
        .select('id, product_id, name, city, rating, title, body, created_at')
        .eq('approved', true)
        .order('created_at', { ascending: false })
        .limit(200)
      if (!error && data && data.length) cache = (data as Row[]).map(rowToReview)
    } catch {
      /* offline: startset blijft staan */
    }
    return cache
  })()
  return inflight
}

/** Gepubliceerde reviews, één keer per sessie opgehaald. */
export function useReviews(): Review[] {
  const [list, setList] = useState(cache)
  useEffect(() => {
    let live = true
    void fetchReviews().then((r) => live && setList(r))
    return () => {
      live = false
    }
  }, [])
  return list
}

export const reviewsFor = (list: Review[], productId: string): Review[] =>
  list.filter((r) => r.productId === productId)

export function reviewStats(list: Review[]): { avg: number; count: number } {
  if (list.length === 0) return { avg: 0, count: 0 }
  const avg = list.reduce((s, r) => s + r.rating, 0) / list.length
  return { avg: Math.round(avg * 10) / 10, count: list.length }
}

/** Review inzenden; verschijnt pas na moderatie in het beheer. */
export async function submitReview(input: {
  productId: string
  name: string
  city: string
  rating: number
  title: string
  body: string
}): Promise<{ ok: boolean; error?: string }> {
  if (input.body.trim().length < 10) {
    return { ok: false, error: 'Vertel iets meer in je review (minimaal 10 tekens).' }
  }
  if (input.name.trim().length < 2) return { ok: false, error: 'Vul je naam in.' }
  if (!supabase) return { ok: true }
  try {
    const { error } = await supabase.from('cortemo_reviews').insert({
      product_id: input.productId,
      name: input.name.trim().slice(0, 80),
      city: input.city.trim().slice(0, 80),
      rating: Math.min(5, Math.max(1, Math.round(input.rating))),
      title: input.title.trim().slice(0, 120),
      body: input.body.trim().slice(0, 1200),
    })
    if (error) return { ok: false, error: 'Versturen lukte niet, probeer het later opnieuw.' }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Versturen lukte niet, probeer het later opnieuw.' }
  }
}
