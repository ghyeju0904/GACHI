import { supabase } from '../services/supabase';
import { getDeviceId } from './deviceId';
import { awardPoints } from './points';

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

  if (created?.id) {
    // 신규 회원가입 웰컴 포인트 10점 즉시 지급
    await awardPoints(created.id, 10, 'welcome', '웰컴 포인트');
  }

  return created?.id || null;
}
