import { supabase } from '../services/supabase';
import { getDeviceId } from './deviceId';

export async function getProfileId() {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('device_id', getDeviceId())
    .single();
  return data?.id || null;
}
