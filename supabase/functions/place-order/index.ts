// Edge function: neemt bestellingen aan, herrekent alle prijzen server-side
// en slaat de order pas op als alles klopt. Dit is de enige route waarlangs
// klantorders de database in kunnen (de anonieme insert-policy is dicht).
//
// Betaal-stub: PAYMENT_PROVIDER (secret) is nu 'none'; zodra Mollie of
// Stripe gekoppeld wordt, maakt createPayment() daar een betaling aan en
// geeft paymentUrl terug. De webhook van de provider zet payment_status.
//
// Orderbevestiging: verstuurt na opslag een mail via Resend als de secrets
// RESEND_API_KEY en MAIL_FROM gezet zijn; zonder secrets wordt de mail
// stilletjes overgeslagen (de order slaagt gewoon).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { calcTotal, mergePricing, parseCfg, validateConfig } from './pricing.ts'

type InItem = {
  key: string
  productId?: string
  name: string
  qty: number
  unitPrice: number
  config: string[]
}

const TOLERANCE = 1 // € afwijking per stuksprijs die we accepteren (afronding)
const euro = (v: number) =>
  '€ ' + v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function createPayment(_orderId: string, _amount: number): Promise<{ paymentUrl: string | null; paymentId: string | null }> {
  const provider = Deno.env.get('PAYMENT_PROVIDER') ?? 'none'
  switch (provider) {
    // case 'mollie': maak betaling via https://api.mollie.com/v2/payments
    //   met MOLLIE_API_KEY; geef _links.checkout.href terug als paymentUrl.
    // case 'stripe': maak een Checkout Session; geef session.url terug.
    default:
      return { paymentUrl: null, paymentId: null }
  }
}

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const { name, email, address, city, items, discountCode, projectId, phone, note, montage } =
      await req.json()
    if (
      typeof name !== 'string' || name.trim().length < 2 ||
      typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email) ||
      typeof address !== 'string' || !address.trim() ||
      !Array.isArray(items) || items.length === 0 || items.length > 50
    ) {
      return json(400, { error: 'Ongeldige bestelling: naam, e-mail, adres en artikelen zijn verplicht.' })
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Ingelogde B2B-partner herkennen via het meegestuurde JWT. Dit is niet
    // te vervalsen: alleen een door Supabase-auth ondertekende token levert
    // een user op, en de partnerkoppeling (user_id) staat server-side.
    let partner: { company: string; discount: number; terms: number } | null = null
    const authHeader = req.headers.get('Authorization') ?? ''
    if (authHeader.startsWith('Bearer ')) {
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      )
      const { data: userData } = await userClient.auth.getUser()
      if (userData?.user) {
        const { data: p } = await db
          .from('cortemo_partners')
          .select('company, discount, payment_terms')
          .eq('user_id', userData.user.id)
          .maybeSingle()
        if (p) {
          partner = {
            company: String(p.company),
            discount: Number(p.discount) || 0,
            terms: Number(p.payment_terms) || 0,
          }
        }
      }
    }

    // actuele tarieven (admin-beheerd) over de bladdefaults
    const { data: settings } = await db
      .from('cortemo_settings')
      .select('value')
      .eq('key', 'pricing')
      .maybeSingle()
    const P = mergePricing(settings?.value)

    /* ---- elke regel server-side naprijzen ---- */
    let subtotal = 0
    for (const raw of items as InItem[]) {
      const qty = Math.floor(Number(raw.qty))
      if (!Number.isFinite(qty) || qty < 1 || qty > 99) {
        return json(400, { error: `Ongeldig aantal bij "${raw.name}".` })
      }
      let expected: number | null = null

      if (typeof raw.key === 'string' && raw.key.startsWith('cfg:')) {
        // maatwerk uit de configurator: volledig herrekenen
        const cfg = parseCfg(raw.key.slice(4))
        if (!cfg) return json(400, { error: `Onleesbare maatwerkconfiguratie bij "${raw.name}".` })
        const errors = validateConfig(cfg, P)
        if (errors.length > 0) {
          return json(422, { error: 'Deze configuratie kan niet gemaakt worden: ' + errors[0] })
        }
        expected = calcTotal(cfg, P)
      } else if (raw.key === 'roestversneller') {
        expected = 29.95
      } else {
        // catalogusproduct: key = productId|variantIndex|optie|optie...
        const [productId, variantIdx, ...optLabels] = String(raw.key).split('|')
        const { data: product } = await db
          .from('cortemo_products')
          .select('price, variants, options, stock')
          .eq('id', productId)
          .maybeSingle()
        if (!product) return json(400, { error: `Onbekend product "${raw.name}".` })
        if (product.stock === 0) return json(409, { error: `"${raw.name}" is uitverkocht.` })
        const variants = (product.variants ?? []) as [string, number][]
        const options = (product.options ?? []) as [string, number][]
        const variant = variants[parseInt(variantIdx, 10)] ?? [null, 0]
        let optSum = 0
        for (const label of optLabels) {
          const opt = options.find(([l]) => l === label)
          if (!opt) return json(400, { error: `Onbekende optie "${label}" bij "${raw.name}".` })
          optSum += opt[1]
        }
        expected = Number(product.price) + variant[1] + optSum
      }

      if (expected === null || Math.abs(expected - Number(raw.unitPrice)) > TOLERANCE) {
        return json(409, {
          error:
            `De prijs van "${raw.name}" klopt niet meer (verwacht ${euro(expected ?? 0)}). ` +
            'Ververs de pagina en probeer het opnieuw.',
          expected,
        })
      }
      subtotal += expected * qty
    }
    subtotal = Math.round(subtotal * 100) / 100

    /* ---- korting: code server-side valideren; partnerkorting en code
       stapelen niet — de hoogste van de twee geldt ---- */
    let codePct = 0
    let codeLabel = ''
    if (typeof discountCode === 'string' && discountCode.trim()) {
      const { data: dc } = await db
        .from('cortemo_discounts')
        .select('code, percent, active, expires')
        .eq('code', discountCode.trim().toUpperCase())
        .maybeSingle()
      const valid = dc && dc.active && (!dc.expires || dc.expires >= new Date().toISOString().slice(0, 10))
      if (!valid) return json(409, { error: 'De kortingscode is niet (meer) geldig.' })
      codePct = Number(dc.percent)
      codeLabel = dc.code
    }
    const partnerPct = partner?.discount ?? 0
    const pct = Math.max(codePct, partnerPct)
    const appliedCode = pct === 0 ? '' : partnerPct >= codePct ? `B2B ${partnerPct}%` : codeLabel
    const discountAmount = Math.round(subtotal * (pct / 100) * 100) / 100
    const total = Math.round((subtotal - discountAmount) * 100) / 100
    const onAccount = !!partner && partner.terms > 0

    /* ---- order opslaan (geverifieerd) ---- */
    const orderId = 'CM-' + String(Date.now()).slice(-6)
    const { error: insErr } = await db.from('cortemo_orders').insert({
      id: orderId,
      name: name.trim(),
      email: email.trim(),
      city: String(city ?? '').trim(),
      address: address.trim(),
      items: (items as InItem[]).map(({ key, name, qty, unitPrice, config }) => ({
        key,
        name,
        qty: Math.floor(Number(qty)),
        unitPrice,
        config,
      })),
      total,
      discount_code: appliedCode,
      discount_amount: discountAmount,
      project_id: typeof projectId === 'string' && projectId ? projectId : null,
      status: 'nieuw',
      payment_status: onAccount ? `op rekening (${partner!.terms} dgn)` : 'open',
      verified: true,
      phone: String(phone ?? '').trim().slice(0, 40),
      note: String(note ?? '').trim().slice(0, 500),
      montage: montage === true,
    })
    if (insErr) return json(500, { error: 'Order opslaan mislukte: ' + insErr.message })

    // op rekening = geen online betaling; anders de (stub-)provider
    const payment = onAccount
      ? { paymentUrl: null, paymentId: null }
      : await createPayment(orderId, total)
    if (payment.paymentId) {
      await db.from('cortemo_orders').update({ payment_id: payment.paymentId }).eq('id', orderId)
    }

    /* ---- orderbevestiging (best effort) ---- */
    const apiKey = Deno.env.get('RESEND_API_KEY')
    let mailed = false
    if (apiKey) {
      const lines = (items as InItem[]).map(
        (i) => `  ${i.qty} × ${i.name}${i.config?.length ? ' (' + i.config.join(', ') + ')' : ''} — ${euro(i.unitPrice * i.qty)}`,
      )
      const body = [
        `Beste ${name.trim()},`,
        '',
        `Bedankt voor je bestelling bij Cortemo. We hebben hem goed ontvangen onder nummer ${orderId}.`,
        '',
        ...lines,
        appliedCode ? `  Korting (${appliedCode}) — −${euro(discountAmount)}` : '',
        `  Totaal incl. btw — ${euro(total)}`,
        '',
        `Bezorgadres: ${address.trim()}${city ? ', ' + String(city).trim() : ''}`,
        onAccount
          ? `Betaling: op rekening (${partner!.terms} dagen) — de factuur volgt per mail.`
          : '',
        montage === true
          ? 'Je hebt plaatsingsservice aangevraagd — we bellen je voor een afspraak en vaste prijs.'
          : '',
        'Ons pallettransport levert doorgaans binnen 5 tot 8 werkdagen; je ontvangt bericht zodra de bestelling in productie gaat.',
        `Volg je bestelling: https://cortemo.nl/volg-je-order (ordernummer ${orderId}).`,
        '',
        'Met vriendelijke groet,',
        'Cortemo — maatwerk cortenstaal',
      ]
        .filter((l) => l !== '')
        .join('\n')
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: Deno.env.get('MAIL_FROM') ?? 'Cortemo <onboarding@resend.dev>',
          to: email.trim(),
          subject: `Bevestiging van je bestelling ${orderId} — Cortemo`,
          text: body,
        }),
      }).catch(() => null)
      mailed = !!res?.ok
    }

    return json(200, {
      ok: true,
      orderId,
      total,
      discountAmount,
      discountLabel: appliedCode,
      onAccount,
      paymentUrl: payment.paymentUrl,
      mailed,
    })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
