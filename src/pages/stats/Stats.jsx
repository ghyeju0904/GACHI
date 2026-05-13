import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { supabase } from '../../services/supabase';
import { getProfileId } from '../../utils/getProfileId';

const COLORS = ['#FF5C35', '#1A1A2E', '#10B981', '#F59E0B', '#8B5CF6'];

const CATEGORY_LABELS = {
  '미라클모닝': '미라클',
  '스터디': '스터디',
  '식단': '식단',
  '운동': '운동',
  '독서': '독서',
  '외국어': '외국어',
  'SNS 업로드': 'SNS',
  '기타': '기타',
};

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [dailyCerts, setDailyCerts]     = useState([]);  // 최근 30일 인증 수
  const [categoryDist, setCategoryDist] = useState([]);  // 카테고리별 챌린지 수
  const [memberTrend, setMemberTrend]   = useState([]);  // 챌린지별 멤버 현황
  const [myStats, setMyStats]           = useState({ totalCerts: 0, streak: 0, challenges: 0 });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const profileId = await getProfileId();

      await Promise.all([
        loadDailyCerts(profileId),
        loadCategoryDist(),
        loadMemberTrend(),
        profileId ? loadMyStats(profileId) : null,
      ]);

      setLoading(false);
    };
    load();
  }, []);

  // 최근 30일 인증 추이 (전체 플랫폼)
  const loadDailyCerts = async (profileId) => {
    const since = new Date();
    since.setDate(since.getDate() - 29);
    const sinceStr = since.toISOString().split('T')[0];

    const { data } = await supabase
      .from('certifications')
      .select('cert_date')
      .gte('cert_date', sinceStr);

    if (!data) return;

    const countMap = {};
    data.forEach(({ cert_date }) => {
      countMap[cert_date] = (countMap[cert_date] || 0) + 1;
    });

    // 최근 30일 날짜 배열 생성
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      days.push({
        date:  key.slice(5),  // MM-DD
        count: countMap[key] || 0,
      });
    }
    setDailyCerts(days);
  };

  // 카테고리별 챌린지 분포
  const loadCategoryDist = async () => {
    const { data } = await supabase
      .from('challenges')
      .select('category')
      .eq('status', 'active');

    if (!data) return;

    const map = {};
    data.forEach(({ category }) => { map[category] = (map[category] || 0) + 1; });

    setCategoryDist(
      Object.entries(map)
        .map(([name, value]) => ({ name: CATEGORY_LABELS[name] || name, value }))
        .sort((a, b) => b.value - a.value)
    );
  };

  // 활성 챌린지 상위 5개 멤버 현황
  const loadMemberTrend = async () => {
    const { data } = await supabase
      .from('challenge_members')
      .select('challenge_id, status, challenges(title, max_members)')
      .not('status', 'in', '(observer,kicked)')
      .eq('challenges.status', 'active');

    if (!data) return;

    const map = {};
    data.forEach(({ challenge_id, challenges }) => {
      if (!challenges) return;
      if (!map[challenge_id]) {
        map[challenge_id] = { name: challenges.title.slice(0, 8) + (challenges.title.length > 8 ? '…' : ''), count: 0, max: challenges.max_members };
      }
      map[challenge_id].count += 1;
    });

    setMemberTrend(
      Object.values(map)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)
    );
  };

  // 내 개인 통계
  const loadMyStats = async (profileId) => {
    const { data: certs } = await supabase
      .from('certifications')
      .select('cert_date')
      .eq('user_id', profileId)
      .order('cert_date', { ascending: false });

    const { count: challengeCount } = await supabase
      .from('challenge_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profileId)
      .eq('status', 'active');

    if (!certs) return;

    const dateSet = new Set(certs.map((c) => c.cert_date));
    const today = new Date().toISOString().split('T')[0];

    let streak = 0;
    const d = new Date();
    while (true) {
      const str = d.toISOString().split('T')[0];
      if (dateSet.has(str)) { streak++; d.setDate(d.getDate() - 1); }
      else break;
    }

    setMyStats({ totalCerts: dateSet.size, streak, challenges: challengeCount || 0 });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text-muted)', fontSize: '14px' }}>
        데이터 불러오는 중...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#F8F9FA', minHeight: '100vh', paddingBottom: '40px' }}>

      <header style={{ padding: '20px 20px 16px', background: 'white', borderBottom: '1px solid var(--border-color)', position: 'sticky', top: 0, zIndex: 10 }}>
        <h1 className="font-display" style={{ fontSize: '20px', margin: 0, color: 'var(--primary)' }}>통계</h1>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0' }}>플랫폼 전체 + 내 활동 현황</p>
      </header>

      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 내 요약 카드 */}
        <section>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-muted)', marginBottom: '10px' }}>내 활동</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: '연속 스트릭', value: `${myStats.streak}일`, color: 'var(--primary)' },
              { label: '총 인증일', value: `${myStats.totalCerts}회`, color: '#10B981' },
              { label: '참여 챌린지', value: `${myStats.challenges}개`, color: '#8B5CF6' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: 'white', borderRadius: '12px', padding: '16px 12px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color }}>{value}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* 최근 30일 인증 추이 */}
        <section style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>최근 30일 인증 현황 (전체)</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyCerts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={6} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                formatter={(v) => [`${v}건`, '인증']}
              />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* 카테고리 분포 */}
        <section style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>카테고리별 챌린지 분포</h2>
          {categoryDist.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>데이터 없음</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie data={categoryDist} dataKey="value" cx="50%" cy="50%" outerRadius={70} paddingAngle={2}>
                    {categoryDist.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}개`, '']} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {categoryDist.map(({ name, value }, i) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                    <span style={{ fontWeight: 'bold', color: COLORS[i % COLORS.length] }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 챌린지 멤버 현황 */}
        <section style={{ background: 'white', borderRadius: '16px', padding: '20px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '16px' }}>인기 챌린지 TOP 5 (멤버 수)</h2>
          {memberTrend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>데이터 없음</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={memberTrend} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                <Tooltip
                  contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                  formatter={(v, _, { payload }) => [`${v} / ${payload.max}명`, '멤버']}
                />
                <Bar dataKey="count" fill="#1A1A2E" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </section>

      </div>
    </div>
  );
}
