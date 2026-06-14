import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';
import * as XLSX from 'npm:xlsx@0.18.5';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

function timeCell(value: unknown) {
  if (typeof value === 'string') return value.trim().slice(0, 5);
  if (typeof value === 'number') {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const minutes = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  return null;
}

function dateCell(value: unknown) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  if (typeof value === 'string') {
    const match = value.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  }
  return null;
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  if (!supabaseUrl || !serviceRoleKey) return new Response('Supabase env missing', { status: 500 });

  const formData = await req.formData();
  const file = formData.get('file');
  const city = String(formData.get('city') ?? 'Wien');
  if (!(file instanceof File)) return new Response('Missing file', { status: 400 });

  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const normalized = rows
    .map((row) => {
      const keys = Object.keys(row);
      const pick = (patterns: RegExp[]) => row[keys.find((key) => patterns.some((pattern) => pattern.test(key))) ?? ''];
      const date = dateCell(pick([/datum/i, /date/i]));
      const fajr = timeCell(pick([/fajr/i, /imsak/i]));
      const sunrise = timeCell(pick([/sunrise/i, /sonnen/i]));
      const dhuhr = timeCell(pick([/dhuhr/i, /zuhr/i, /mittag/i]));
      const asr = timeCell(pick([/asr/i]));
      const maghrib = timeCell(pick([/maghrib/i, /abend/i]));
      const isha = timeCell(pick([/isha/i, /ischa/i]));
      if (!date || !fajr || !dhuhr || !asr || !maghrib || !isha) return null;
      return { city, date, fajr, sunrise, dhuhr, asr, maghrib, isha, source: 'IZW XLSX' };
    })
    .filter(Boolean);

  const { error } = await supabase.from('prayer_times').upsert(normalized, { onConflict: 'city,date' });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ imported: normalized.length });
});
