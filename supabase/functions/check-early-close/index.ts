// Cron: 매시간 실행 — 조기 종료 투표 75% 달성 시 자동 종료
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async () => {
  // 조기 종료 투표가 진행 중인 챌린지
  const { data: challenges, error } = await supabase
    .from('challenges')
    .select('id, title, max_members')
    .eq('status', 'active')
    .eq('early_close_active', true);

  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  if (!challenges || challenges.length === 0) return new Response(JSON.stringify({ closed: 0 }));

  const closedIds: number[] = [];

  for (const challenge of challenges) {
    // 현재 활성 멤버 수
    const { count: memberCount } = await supabase
      .from('challenge_members')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id)
      .not('status', 'in', '(observer,kicked)');

    if (!memberCount) continue;

    // 24시간 내 동의 투표 수
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: agreeCount } = await supabase
      .from('early_close_votes')
      .select('*', { count: 'exact', head: true })
      .eq('challenge_id', challenge.id)
      .eq('agreed', true)
      .gte('created_at', since);

    if (!agreeCount) continue;

    const ratio = agreeCount / memberCount;
    if (ratio < 0.75) continue;

    // 75% 달성 → 조기 종료
    await supabase
      .from('challenges')
      .update({ status: 'early_closed', early_closed_at: new Date().toISOString() })
      .eq('id', challenge.id);

    // 멤버 전체 알림
    const { data: members } = await supabase
      .from('challenge_members')
      .select('user_id')
      .eq('challenge_id', challenge.id)
      .eq('status', 'active');

    if (members) {
      const notifications = members.map((m) => ({
        user_id:      m.user_id,
        type:         'early_closed',
        challenge_id: challenge.id,
        message:      `"${challenge.title}" 챌린지가 참여자 동의로 조기 종료되었습니다.`,
        read:         false,
      }));
      await supabase.from('notifications').insert(notifications);
    }

    closedIds.push(challenge.id);
  }

  return new Response(JSON.stringify({ closed: closedIds.length, ids: closedIds }));
});
