import { supabase } from '../services/supabase'

export async function logEvent({
  userId,
  event,
  page,
  metadata = {}
}) {
  const { error } = await supabase.from('user_logs').insert([
    {
      user_id: userId,
      event,
      page,
      metadata
    }
  ])

  if (error) {
    console.error('log error:', error)
  }
}