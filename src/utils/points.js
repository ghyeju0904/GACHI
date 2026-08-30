import { supabase } from '../services/supabase';

/**
 * 포인트를 증감시키고 point_transactions에 원장을 남긴다.
 * amount<0인데 잔액이 부족하면 error.message === 'insufficient_points'로 실패한다.
 * @returns {Promise<{ balance: number|null, error: Error|null }>}
 */
export async function adjustPoints(userId, amount, category, description = null, challengeId = null) {
  const { data, error } = await supabase.rpc('adjust_points', {
    p_user: userId,
    p_amount: amount,
    p_category: category,
    p_description: description,
    p_challenge_id: challengeId,
  });
  if (error) return { balance: null, error };
  return { balance: data, error: null };
}

export async function awardPoints(userId, amount, category, description = null, challengeId = null) {
  return adjustPoints(userId, amount, category, description, challengeId);
}

/** 챌린지 참여비 2P 차감. 잔액 부족 시 error.message === 'insufficient_points'. */
export async function spendJoinFee(userId, challengeId, description = '챌린지 참여') {
  return adjustPoints(userId, -2, 'join', description, challengeId);
}

export async function getMyPoints(userId) {
  const { data } = await supabase.from('profiles').select('points').eq('id', userId).single();
  return data?.points ?? 0;
}
