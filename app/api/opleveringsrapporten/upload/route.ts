import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/session'
import { put } from '@vercel/blob'

export async function POST(req: NextRequest) {
  const session = await requireSession()
  if (!session) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })

  const blob = await put(`rapporten/${Date.now()}-${file.name}`, file, { access: 'public' })
  return NextResponse.json({ url: blob.url })
}
