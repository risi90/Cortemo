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
// Defaults van het Cortemo-productieproject. De publishable key is per
// ontwerp veilig om in clientcode te staan: alle toegang loopt via RLS.
const DEFAULT_URL = 'https://gulepwtnlmjpjwkatfiv.supabase.co'
const DEFAULT_KEY = 'sb_publishable_Cnn-Cl-Rb8sdmoLJ9vobuQ_2jG10KP4'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_URL
const key = (import.meta.env.VITE_SUPABASE_KEY as string | undefined) || DEFAULT_KEY

export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null

export const hasBackend = supabase !== null
