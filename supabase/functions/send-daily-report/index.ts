// Cron: 매일 00:00 KST(=전날 15:00 UTC) 실행 — 전날 인증률/신고 현황을 모임장(+부모임장)에게 리포트로 발송
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  // KST 기준 "어제" 날짜 계산
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
  kstNow.setDate(kstNow.getDate() - 1);
  const targetDate = kstNow.toISOString().split('T')[0];

  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('id, title, created_by, sub_owner_id')
    .eq('status', 'active');

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  let sent = 0;

  for (const ch of challenges || []) {
    const [{ data: members }, { data: certs }, { data: reports }] = await Promise.all([
      supabase.from('challenge_members').select('user_id').eq('challenge_id', ch.id).eq('status', 'active'),
      supabase.from('certifications').select('user_id').eq('challenge_id', ch.id).eq('cert_date', targetDate),
      supabase.from('reports').select('id, status').eq('challenge_id', ch.id).eq('report_date', targetDate),
    ]);

    const memberCount = (members || []).length;
    const certCount   = (certs || []).length;
    const pendingReports = (reports || []).filter((r) => r.status === 'pending').length;

    if (memberCount === 0) continue;

    const message = `[${targetDate} 일일 리포트] '${ch.title}' 인증 ${certCount}/${memberCount}명 · 신고 ${(reports || []).length}건(대기 ${pendingReports}건)`;

    const recipients = [ch.created_by, ch.sub_owner_id].filter(Boolean);
    const notifications = recipients.map((uid) => ({
      user_id: uid,
      challenge_id: ch.id,
      type: 'daily_report',
      message,
      read: false,
    }));

    if (notifications.length) {
      await supabase.from('notifications').insert(notifications);
      sent += notifications.length;
    }
  }

  return new Response(JSON.stringify({ sent, targetDate }));
});
