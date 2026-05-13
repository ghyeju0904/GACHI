import { supabase } from './supabase';
import { getDeviceId } from '../utils/deviceId';

function sendGa(event, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', event, params);
  }
}

export async function logEvent(event, page = '', metadata = {}) {
  // Supabase 자체 로그
  await supabase.from('user_logs').insert({
    device_id: getDeviceId(),
    event,
    page,
    metadata,
  });

  // Google Analytics 이벤트 전송
  sendGa(event, { page, ...metadata });
}
