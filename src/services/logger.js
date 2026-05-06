import { supabase } from './supabase';
import { getDeviceId } from '../utils/deviceId';

export async function logEvent(event, page = '', metadata = {}) {
  await supabase.from('user_logs').insert({
    device_id: getDeviceId(),
    event,
    page,
    metadata,
  });
}
