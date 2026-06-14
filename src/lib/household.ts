import { supabase } from './supabase';

export async function getMyHouseholds() {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('household_members')
    .select('household_id, role, households(id, name)')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}
