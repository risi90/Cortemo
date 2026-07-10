// Edge function: verstuurt een mailing via Resend en logt hem in
// cortemo_mailings. Alleen aan te roepen door ingelogde Cortemo-admins.
//
// Vereiste secrets (Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY  — API-key van resend.com
//   MAIL_FROM       — afzender, bijv. "Cortemo <nieuws@cortemo.nl>" (domein
//                     eerst verifiëren in Resend)
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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

    // alleen admins mogen mailen
    const { data: isAdmin } = await supabase.rpc('is_cortemo_admin')
    if (!isAdmin) return json(403, { error: 'Alleen Cortemo-beheerders mogen mailings versturen.' })

    const { subject, body, audience } = await req.json()
    if (!subject?.trim() || !body?.trim()) {
      return json(400, { error: 'Onderwerp en bericht zijn verplicht.' })
    }

    // doelgroep bepalen
    let recipients: string[] = []
    if (audience === 'B2B-partners') {
      const { data } = await supabase.from('cortemo_partners').select('email')
      recipients = (data ?? []).map((p: { email: string }) => p.email)
    } else {
      const { data } = await supabase.from('cortemo_orders').select('email')
      recipients = [...new Set((data ?? []).map((o: { email: string }) => o.email))]
    }
    if (recipients.length === 0) {
      return json(400, { error: 'Geen ontvangers gevonden voor deze doelgroep.' })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) {
      return json(500, {
        error: 'RESEND_API_KEY ontbreekt. Voeg hem toe bij Edge Function secrets.',
      })
    }

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') ?? 'Cortemo <onboarding@resend.dev>',
        to: 'nieuws@cortemo.nl',
        bcc: recipients,
        subject,
        text: body,
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      return json(502, { error: 'Resend weigerde de mail: ' + detail })
    }

    const id = 'ML-' + String(Date.now()).slice(-6)
    await supabase.from('cortemo_mailings').insert({
      id,
      subject,
      body,
      audience,
      recipients: recipients.length,
      status: 'verzonden',
    })

    return json(200, { id, recipients: recipients.length })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
