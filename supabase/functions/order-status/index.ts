// Edge function: publieke orderstatus-tracker. Klant geeft ordernummer +
// e-mailadres op; alleen als die combinatie klopt komt er een compacte
// status terug (geen adres- of betaalgegevens die meer prijsgeven dan de
// klant zelf al weet). Draait met service role omdat cortemo_orders voor
// anoniem verkeer terecht dicht staat.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

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
    const { order, email } = await req.json()
    if (
      typeof order !== 'string' || !order.trim() ||
      typeof email !== 'string' || !/\S+@\S+\.\S+/.test(email)
    ) {
      return json(400, { error: 'Vul je ordernummer en e-mailadres in.' })
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )
    const { data } = await db
      .from('cortemo_orders')
      .select('id, created_at, status, payment_status, items, total, montage')
      .eq('id', order.trim().toUpperCase())
      .ilike('email', email.trim())
      .maybeSingle()

    if (!data) {
      return json(404, {
        error: 'Geen bestelling gevonden met deze combinatie van ordernummer en e-mailadres.',
      })
    }

    const items = Array.isArray(data.items)
      ? (data.items as { name?: string; qty?: number }[]).map((i) => ({
          name: String(i.name ?? ''),
          qty: Number(i.qty) || 1,
        }))
      : []

    return json(200, {
      ok: true,
      orderId: data.id,
      date: data.created_at,
      status: String(data.status ?? 'nieuw'),
      paymentStatus: String(data.payment_status ?? ''),
      total: Number(data.total) || 0,
      montage: !!data.montage,
      items,
    })
  } catch (e) {
    return json(500, { error: String(e) })
  }
})
