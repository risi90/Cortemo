// Edge function: verstuurt een offerte per e-mail (Resend) naar één klant.
// Alleen aan te roepen door ingelogde Cortemo-admins.
// Secrets: RESEND_API_KEY en MAIL_FROM (zie send-mailing).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

type Line = { descr: string; qty: number; price: number }

const euro = (v: number) =>
  '€ ' + v.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

Deno.serve(async (req: Request) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
  }
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } },
    )
    const { data: isAdmin } = await supabase.rpc('is_cortemo_admin')
    if (!isAdmin) return json(403, { error: 'Alleen Cortemo-beheerders mogen offertes versturen.' })

    const { id, customer, email, lines, discount, total, note, validUntil } = await req.json()
    if (!email || !customer || !Array.isArray(lines) || lines.length === 0) {
      return json(400, { error: 'Klant, e-mailadres en minimaal één offerteregel zijn verplicht.' })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json(500, { error: 'RESEND_API_KEY ontbreekt. Voeg hem toe bij Edge Function secrets.' })
    }

    const rows = (lines as Line[])
      .map((l) => `- ${l.qty} × ${l.descr}: ${euro(l.price * l.qty)}`)
      .join('\n')
    const body = [
      `Beste ${customer},`,
      '',
      `Bedankt voor je aanvraag. Hierbij onze offerte ${id}:`,
      '',
      rows,
      discount > 0 ? `\nPartnerkorting: -${Math.round(discount * 100)}%` : '',
      `\nTotaal incl. btw: ${euro(total)}`,
      validUntil ? `Geldig tot: ${validUntil}` : '',
      note ? `\n${note}` : '',
      '',
      'Vragen of akkoord? Beantwoord deze mail, dan plannen we de productie in.',
      '',
      'Met vriendelijke groet,',
      'Cortemo — maatwerk cortenstaal',
    ]
      .filter(Boolean)
      .join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') ?? 'Cortemo <onboarding@resend.dev>',
        to: email,
        subject: `Offerte ${id} — Cortemo maatwerk cortenstaal`,
        text: body,
      }),
    })
    if (!res.ok) return json(502, { error: 'Resend weigerde de mail: ' + (await res.text()) })

    return json(200, { ok: true })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
