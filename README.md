This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Betalen: ABN AMRO + Tikkie Zakelijk

Environment variables (Vercel → Settings → Environment Variables, zie ook `.env.example`):

| Variabele | Betekenis |
|---|---|
| `BEDRIJF_IBAN` | Zakelijke ABN AMRO-rekening. Verplicht: zonder deze wordt er géén IBAN/betaal-QR getoond (fout in de log). |
| `BEDRIJF_BIC` | BIC voor de EPC-QR, standaard `ABNANL2A`. |
| `TIKKIE_API_KEY` | API-key van de app op developer.abnamro.com. |
| `TIKKIE_APP_TOKEN` | App-token uit Tikkie Zakelijk. |
| `TIKKIE_OMGEVING` | `sandbox` of `productie` (standaard). |

Werking:

- Bij **Factuur versturen** maakt het CRM automatisch een Tikkie voor het bedrag van die (deel)factuur
  (voorschot- en eindfactuur krijgen elk een eigen Tikkie). Mislukt dat, dan gaat de factuur zonder Tikkie de deur uit
  en komt er een melding.
- De Tikkie-link staat als "Betaal met Tikkie" in de mail, op de PDF (met QR) en in het klantportaal; IBAN + EPC-QR blijven als tweede optie.
- `POST /api/webhooks/tikkie` ontvangt betaalnotificaties; de betalingen worden altijd bij Tikkie zelf opgehaald.
  De dagelijkse cron (`/api/cron`) en "Status ophalen" op het factuurscherm controleren openstaande Tikkies als vangnet.
- Er wordt **geen** betaling in Moneybird geregistreerd: dat loopt via de bankkoppeling ABN AMRO → Moneybird.
- Instellingen → Boekhouding: "Test Tikkie-koppeling" en (eenmalig) "Tikkie-webhook activeren".
