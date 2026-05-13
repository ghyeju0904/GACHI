import { supabase } from '../services/supabase';
import { getDeviceId } from './deviceId';

export async function getProfileId() {
  const deviceId = getDeviceId();

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('device_id', deviceId)
    .single();

  if (data?.id) return data.id;

  // 배포 환경에서 온보딩 없이 진입하거나 프로필 생성에 실패한 경우 자동 생성
  const { data: created } = await supabase
    .from('profiles')
    .upsert({ device_id: deviceId }, { onConflict: 'device_id' })
    .select('id')
    .single();

  return created?.id || null;
}
