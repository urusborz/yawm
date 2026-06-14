import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

function viennaParts() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Vienna',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${pick('year')}-${pick('month')}-${pick('day')}`,
    time: `${pick('hour')}:${pick('minute')}`,
  };
}

serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) return new Response('Supabase env missing', { status: 500 });

  const { date, time } = viennaParts();
  const { data: prayerDay, error } = await supabase.from('prayer_times').select('*').eq('city', 'Wien').eq('date', date).maybeSingle();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!prayerDay) return Response.json({ sent: 0, reason: 'no prayer times' });

  const due = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'].filter((key) => String(prayerDay[key]).slice(0, 5) === time);
  if (due.length === 0) return Response.json({ sent: 0 });

  // The actual Web Push send is wired in the next phase after VAPID keys are generated.
  // This function already resolves the minute-level due prayers for pg_cron.
  return Response.json({ due, date, time, sent: 0, next: 'wire web-push with VAPID private key' });
});
