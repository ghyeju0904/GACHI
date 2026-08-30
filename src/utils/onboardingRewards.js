import { supabase } from '../services/supabase';
import { awardPoints } from './points';

/**
 * 온보딩 미션은 최초 1회만 포인트를 지급한다.
 * profiles.onboarding_rewards jsonb에 { [key]: true } 로 기록해 중복 지급을 막는다.
 */
const REWARD_LABEL = {
  interests: '관심 주제 설정',
  intro:     '모임 소개글 확인',
  favorite:  '모임 즐겨찾기',
  joined:    '모임 참여',
  created:   '모임 개설',
};

export async function grantOnboardingReward(userId, key) {
  if (!userId || !REWARD_LABEL[key]) return false;

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_rewards')
    .eq('id', userId)
    .single();

  const rewards = profile?.onboarding_rewards || {};
  if (rewards[key]) return false; // 이미 지급됨

  const { error } = await awardPoints(userId, 2, 'onboarding', REWARD_LABEL[key]);
  if (error) return false;

  await supabase
    .from('profiles')
    .update({ onboarding_rewards: { ...rewards, [key]: true } })
    .eq('id', userId);

  return true;
}
