// 로그인 없이 사용자를 구분하기 위한 고유 ID
// 추후 Supabase Auth 연동 시 user.id로 교체
export function getDeviceId() {
  let id = localStorage.getItem('device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('device_id', id);
  }
  return id;
}
