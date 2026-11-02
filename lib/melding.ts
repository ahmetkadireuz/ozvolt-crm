// Pushmeldingen naar Ahmets telefoon via het CRM zelf (web push, CRM als app op het beginscherm).
// De VAPID-sleutels worden bij het eerste gebruik aangemaakt en in de database bewaard,
// dus er hoeft niets in Vercel te worden ingesteld. Een mislukte melding wordt alleen gelogd.
import webpush from 'web-push'
import { sql } from '@/lib/db'

async function zorgVoorTabellen() {
  await sql`CREATE TABLE IF NOT EXISTS push_abonnementen (
    id            SERIAL PRIMARY KEY,
    endpoint      TEXT UNIQUE NOT NULL,
    p256dh        TEXT NOT NULL,
    auth          TEXT NOT NULL,
    apparaat      VARCHAR(255),
    aangemaakt_op TIMESTAMPTZ DEFAULT NOW()
  )`
  await sql`CREATE TABLE IF NOT EXISTS push_sleutels (
    id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    public_key  TEXT NOT NULL,
    private_key TEXT NOT NULL
  )`
}

export async function vapidSleutels(): Promise<{ publicKey: string; privateKey: string }> {
  await zorgVoorTabellen()
  const rows = await sql`SELECT public_key, private_key FROM push_sleutels WHERE id = 1`
  if (rows[0]) return { publicKey: rows[0].public_key, privateKey: rows[0].private_key }
  const nieuw = webpush.generateVAPIDKeys()
  await sql`INSERT INTO push_sleutels (id, public_key, private_key) VALUES (1, ${nieuw.publicKey}, ${nieuw.privateKey}) ON CONFLICT (id) DO NOTHING`
  const opnieuw = await sql`SELECT public_key, private_key FROM push_sleutels WHERE id = 1`
  return { publicKey: opnieuw[0].public_key, privateKey: opnieuw[0].private_key }
}

export async function bewaarAbonnement(sub: { endpoint: string; keys: { p256dh: string; auth: string } }, apparaat: string | null) {
  await zorgVoorTabellen()
  await sql`
    INSERT INTO push_abonnementen (endpoint, p256dh, auth, apparaat)
    VALUES (${sub.endpoint}, ${sub.keys.p256dh}, ${sub.keys.auth}, ${apparaat})
    ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth, apparaat = EXCLUDED.apparaat
  `
}

export async function verwijderAbonnement(endpoint: string) {
  await zorgVoorTabellen()
  await sql`DELETE FROM push_abonnementen WHERE endpoint = ${endpoint}`
}

// link: pad binnen het CRM, bijv. '/offertes/12'
export async function stuurPushMelding(p: { titel: string; bericht: string; link?: string }) {
  try {
    const { publicKey, privateKey } = await vapidSleutels()
    const abonnementen = await sql`SELECT endpoint, p256dh, auth FROM push_abonnementen`
    if (!abonnementen.length) return
    const payload = JSON.stringify({ titel: p.titel, bericht: p.bericht, link: p.link ?? '/notificaties' })
    const opties = {
      vapidDetails: { subject: 'mailto:info@ozvoltelektro.nl', publicKey, privateKey },
      TTL: 60 * 60 * 24,
      urgency: 'high' as const,
    }
    await Promise.all(abonnementen.map(async a => {
      try {
        await webpush.sendNotification({ endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } }, payload, opties)
      } catch (err: any) {
        // 404/410: abonnement bestaat niet meer (app verwijderd, meldingen uitgezet)
        if (err?.statusCode === 404 || err?.statusCode === 410) await verwijderAbonnement(a.endpoint)
        else console.error('[pushmelding]', err?.statusCode, err?.body ?? err)
      }
    }))
  } catch (err) {
    console.error('[pushmelding]', err)
  }
}
