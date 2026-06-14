import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.50.0';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const supabase = createClient(supabaseUrl, serviceRoleKey);

serve(async () => {
  if (!supabaseUrl || !serviceRoleKey) return new Response('Supabase env missing', { status: 500 });

  const now = new Date().toISOString();
  const { data: jobs, error } = await supabase
    .from('notification_jobs')
    .select('*')
    .eq('status', 'pending')
    .lte('scheduled_for', now)
    .limit(50);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // The queue query is in place. Web Push fan-out is enabled once VAPID keys exist.
  return Response.json({ ready: jobs?.length ?? 0, sent: 0, next: 'wire household fan-out web-push' });
});
