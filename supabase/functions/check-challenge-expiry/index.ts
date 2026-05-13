// Cron: 매일 자정 실행 — 기간이 끝난 챌린지를 자동으로 완료 처리
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  const today = new Date().toISOString().split('T')[0];

  // end_date가 지났고 아직 active인 챌린지 조회
  const { data: expired, error } = await supabase
    .from('challenges')
    .select('id, title, max_members')
    .eq('status', 'active')
    .lt('end_date', today);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!expired || expired.length === 0) return new Response(JSON.stringify({ closed: 0 }));

  const ids = expired.map((c) => c.id);

  // status → 'completed' 로 일괄 변경
  const { error: updateError } = await supabase
    .from('challenges')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .in('id', ids);

  if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });

  // 완료된 챌린지 멤버들에게 알림 발송
  for (const challenge of expired) {
    const { data: members } = await supabase
      .from('challenge_members')
      .select('user_id')
      .eq('challenge_id', challenge.id)
      .eq('status', 'active');

    if (!members) continue;

    const notifications = members.map((m) => ({
      user_id:      m.user_id,
      type:         'challenge_completed',
      challenge_id: challenge.id,
      message:      `"${challenge.title}" 챌린지가 종료되었습니다. 결과를 확인해보세요!`,
      read:         false,
    }));

    await supabase.from('notifications').insert(notifications);
  }

  return new Response(JSON.stringify({ closed: ids.length, ids }));
});
