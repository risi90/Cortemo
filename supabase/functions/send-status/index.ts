// Edge function: mailt de klant over een orderstatuswijziging (Resend).
// Alleen aan te roepen door ingelogde Cortemo-admins.
// Secrets: RESEND_API_KEY en MAIL_FROM.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const MESSAGES: Record<string, string> = {
  'in productie':
    'Goed nieuws: je bestelling is in productie genomen. Onze staalbouwers zijn ermee aan de slag.',
  verzonden:
    'Je bestelling is onderweg! Het pallettransport levert doorgaans binnen 2 tot 4 werkdagen. De chauffeur belt vooraf.',
  geannuleerd:
    'Je bestelling is geannuleerd. Heb je hier vragen over, beantwoord dan deze mail.',
}

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
    if (!isAdmin) return json(403, { error: 'Alleen Cortemo-beheerders mogen statusmails sturen.' })

    const { orderId, name, email, status } = await req.json()
    if (!orderId || !email || !MESSAGES[status]) {
      return json(400, { error: 'orderId, email en een bekende status zijn verplicht.' })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json(500, { error: 'RESEND_API_KEY ontbreekt. Voeg hem toe bij Edge Function secrets.' })
    }

    const body = [
      `Beste ${name || 'klant'},`,
      '',
      MESSAGES[status],
      '',
      `Ordernummer: ${orderId}`,
      '',
      'Met vriendelijke groet,',
      'Cortemo — maatwerk cortenstaal',
    ].join('\n')

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') ?? 'Cortemo <onboarding@resend.dev>',
        to: email,
        subject: `Update over je bestelling ${orderId} — Cortemo`,
        text: body,
      }),
    })
    if (!res.ok) return json(502, { error: 'Resend weigerde de mail: ' + (await res.text()) })
    return json(200, { ok: true })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
