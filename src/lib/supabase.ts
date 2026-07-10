import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase-koppeling. Zonder env-configuratie draait de hele site op de
 * localStorage-fallback in adminStore; mét configuratie worden catalogus,
 * orders, offertes, partners, tarieven en mailings uit de database bediend.
 *
 * Activeren: zet in .env(.local)
 *   VITE_SUPABASE_URL=https://<project>.supabase.co
 *   VITE_SUPABASE_KEY=<publishable key>
 * en draai supabase/migrations/0001_cortemo_init.sql in het project.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_KEY as string | undefined

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export const hasBackend = supabase !== null
