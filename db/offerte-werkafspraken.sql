-- Werkafspraken & bijlagen in offerte — voer uit via Neon SQL Editor
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS wa_items   JSONB DEFAULT '[]';
ALTER TABLE offertes ADD COLUMN IF NOT EXISTS bijlagen   JSONB DEFAULT '[]';
