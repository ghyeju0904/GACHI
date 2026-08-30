// Cron: 매일 21:59 KST(=12:59 UTC) 실행 — 인증 마감(23:59) 2시간 전, 오늘 미인증 참여자에게 알림
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// 2026년 한국 공휴일 (best-effort 하드코딩 — 공휴일 API 연동 전까지의 임시 목록)
const KR_HOLIDAYS_2026 = new Set([
  '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
  '2026-03-01', '2026-03-02', '2026-05-05', '2026-05-24', '2026-05-25',
  '2026-06-06', '2026-08-15', '2026-08-17', '2026-09-24', '2026-09-25',
  '2026-09-26', '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
]);

function isCertRequiredToday(dayType: string, excludeHoliday: boolean, today: Date): boolean {
  const dow = today.getDay(); // 0=일 ... 6=토
  const dateStr = today.toISOString().split('T')[0];

  if (excludeHoliday && KR_HOLIDAYS_2026.has(dateStr)) return false;
  if (dayType === 'weekday') return dow >= 1 && dow <= 5;
  if (dayType === 'weekend') return dow === 0 || dow === 6;
  return true; // 'all'
}

Deno.serve(async () => {
  // KST(UTC+9) 기준 날짜/요일로 계산 (cron은 UTC 기준으로 등록됨)
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('id, title, day_type, exclude_holiday')
    .eq('status', 'active');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let notified = 0;

  for (const ch of challenges || []) {
    if (!isCertRequiredToday(ch.day_type || 'all', ch.exclude_holiday, now)) continue;

    const [{ data: members }, { data: certs }] = await Promise.all([
      supabase.from('challenge_members').select('user_id').eq('challenge_id', ch.id).eq('status', 'active'),
      supabase.from('certifications').select('user_id').eq('challenge_id', ch.id).eq('cert_date', todayStr),
    ]);

    const certifiedIds = new Set((certs || []).map((c) => c.user_id));
    const targetUserIds = (members || []).map((m) => m.user_id).filter((uid) => !certifiedIds.has(uid));
    if (targetUserIds.length === 0) continue;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, notify_enabled')
      .in('id', targetUserIds);

    const notifyTargets = (profiles || []).filter((p) => p.notify_enabled !== false).map((p) => p.id);
    if (notifyTargets.length === 0) continue;

    const notifications = notifyTargets.map((uid) => ({
      user_id: uid,
      challenge_id: ch.id,
      type: 'uncertified_reminder',
      message: `'${ch.title}' 오늘의 인증 마감까지 2시간 남았어요!`,
      read: false,
    }));

    await supabase.from('notifications').insert(notifications);
    notified += notifications.length;
  }

  return new Response(JSON.stringify({ notified }));
});
