-- ============================================================================
-- GACHI: 보증금 기반 → 포인트 기반(기획서) 전환 마이그레이션
-- Supabase 대시보드 > SQL Editor 에서 전체 실행하세요.
-- 실행 후 PostgREST 스키마 캐시가 자동 갱신될 때까지 몇 초 정도 걸릴 수 있습니다.
-- ============================================================================

-- ========================================================================
-- 1. profiles
-- ========================================================================
alter table profiles
  add column if not exists points integer not null default 0,
  add column if not exists notify_enabled boolean not null default true,
  add column if not exists onboarding_rewards jsonb not null default '{}'::jsonb,
  add column if not exists owner_penalty_count integer not null default 0,
  add column if not exists owner_restricted_until date;

-- ========================================================================
-- 2. challenges — 보증금 컬럼 제거, 포인트/공개설정/복수인증/부모임장 추가
-- ========================================================================
alter table challenges
  add column if not exists is_public boolean not null default true,
  add column if not exists certify_types text[],
  add column if not exists sub_owner_id uuid references profiles(id),
  add column if not exists day_type text not null default 'all',
  add column if not exists exclude_holiday boolean not null default false;

update challenges
  set certify_types = array[certify_type]
  where certify_types is null and certify_type is not null;

alter table challenges drop column if exists deposit;
alter table challenges drop column if exists owner_participates;
alter table challenges drop column if exists certify_type;

-- ========================================================================
-- 3. challenge_members — 경고 카운트, 완료 보상 중복 지급 방지
-- ========================================================================
alter table challenge_members
  add column if not exists warning_count integer not null default 0,
  add column if not exists reward_claimed boolean not null default false;

-- ========================================================================
-- 4. certifications — 1일 1회 수정 제한
-- ========================================================================
alter table certifications
  add column if not exists edit_count integer not null default 0;

-- ========================================================================
-- 4-1. 기존 테이블의 challenges/certifications 참조 FK를 전부 on delete cascade로 교정
--      (서비스 탈퇴 시 challenges 행 삭제, 관리 화면의 개설 롤백이 정상 동작하려면 필요)
-- ========================================================================
do $$
declare
  fk record;
begin
  for fk in
    select con.conname,
           con.conrelid::regclass::text as child_table,
           con.confrelid::regclass::text as parent_table,
           att.attname as fk_column
    from pg_constraint con
    join pg_attribute att
      on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid in ('challenges'::regclass, 'certifications'::regclass)
      and con.confdeltype <> 'c'
  loop
    execute format('alter table %s drop constraint %I', fk.child_table, fk.conname);
    execute format(
      'alter table %s add constraint %I foreign key (%I) references %s(id) on delete cascade',
      fk.child_table, fk.conname, fk.fk_column, fk.parent_table
    );
  end loop;
end $$;

-- ========================================================================
-- 5. 신규 테이블
-- ========================================================================

-- 즐겨찾기 (+ 온보딩 필수 미션 트래킹 겸용)
create table if not exists favorites (
  user_id      uuid not null references profiles(id) on delete cascade,
  challenge_id bigint not null references challenges(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (user_id, challenge_id)
);

-- 포인트 내역 (마이페이지 카테고리별 표시용 원장)
create table if not exists point_transactions (
  id           bigint generated always as identity primary key,
  user_id      uuid not null references profiles(id) on delete cascade,
  amount       integer not null,
  category     text not null,
  description  text,
  challenge_id bigint references challenges(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_point_transactions_user on point_transactions(user_id, created_at desc);

-- 인증 신고 (한 모임 기준 하루 1회)
create table if not exists reports (
  id                bigint generated always as identity primary key,
  challenge_id      bigint not null references challenges(id) on delete cascade,
  certification_id  bigint references certifications(id) on delete cascade,
  reporter_id       uuid not null references profiles(id) on delete cascade,
  reported_user_id  uuid not null references profiles(id) on delete cascade,
  report_date       date not null,
  status            text not null default 'pending'
                       check (status in ('pending', 'warned', 'dismissed', 'false_report')),
  resolved_by       uuid references profiles(id),
  resolved_at       timestamptz,
  created_at        timestamptz not null default now(),
  unique (challenge_id, reporter_id, report_date)
);
create index if not exists idx_reports_target on reports(challenge_id, reported_user_id, report_date);

-- 경고 이력 (일일 리포트 / 신고 내역 표시용)
create table if not exists warning_log (
  id           bigint generated always as identity primary key,
  challenge_id bigint not null references challenges(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  reason       text not null,
  created_at   timestamptz not null default now()
);

-- 모임장 승계 제안
create table if not exists succession_requests (
  id           bigint generated always as identity primary key,
  challenge_id bigint not null references challenges(id) on delete cascade,
  offered_to   uuid not null references profiles(id) on delete cascade,
  status       text not null default 'pending'
                  check (status in ('pending', 'accepted', 'declined')),
  created_at   timestamptz not null default now()
);

-- 모임장 본인 인증 신고 시 참여자 투표
create table if not exists owner_report_votes (
  id         bigint generated always as identity primary key,
  report_id  bigint not null references reports(id) on delete cascade,
  voter_id   uuid not null references profiles(id) on delete cascade,
  agree      boolean not null,
  created_at timestamptz not null default now(),
  unique (report_id, voter_id)
);

-- 모임장 승계 희망자가 없을 때 "모임 계속 운영 여부" 찬반 투표
create table if not exists continuation_votes (
  id           bigint generated always as identity primary key,
  challenge_id bigint not null references challenges(id) on delete cascade,
  voter_id     uuid not null references profiles(id) on delete cascade,
  agree        boolean not null,
  created_at   timestamptz not null default now(),
  unique (challenge_id, voter_id)
);

-- 새 테이블은 기존 테이블과 동일하게 anon key로 직접 read/write 하므로 RLS를 걸지 않는다.
alter table favorites disable row level security;
alter table point_transactions disable row level security;
alter table reports disable row level security;
alter table warning_log disable row level security;
alter table succession_requests disable row level security;
alter table owner_report_votes disable row level security;
alter table continuation_votes disable row level security;

grant select, insert, update, delete on
  favorites, point_transactions, reports, warning_log, succession_requests, owner_report_votes, continuation_votes
  to anon, authenticated;

-- ========================================================================
-- 6. RPC 함수
-- ========================================================================

-- 포인트 증감 + 원장 기록을 원자적으로 처리. amount<0이고 잔액 부족하면 예외 발생.
create or replace function adjust_points(
  p_user uuid,
  p_amount integer,
  p_category text,
  p_description text default null,
  p_challenge_id bigint default null
) returns integer
language plpgsql
security definer
as $$
declare
  v_new_balance integer;
begin
  update profiles
    set points = points + p_amount
    where id = p_user
    returning points into v_new_balance;

  if v_new_balance is null then
    raise exception 'profile not found: %', p_user;
  end if;

  if v_new_balance < 0 then
    raise exception 'insufficient_points';
  end if;

  insert into point_transactions (user_id, amount, category, description, challenge_id)
  values (p_user, p_amount, p_category, p_description, p_challenge_id);

  return v_new_balance;
end;
$$;

grant execute on function adjust_points(uuid, integer, text, text, bigint) to anon, authenticated;

-- 경고 부여. 3회 누적 시 일반 멤버는 강퇴, 모임장이면 퇴출 + 환불 + 승계 절차 트리거.
create or replace function apply_warning(
  p_challenge_id bigint,
  p_user uuid,
  p_reason text
) returns void
language plpgsql
security definer
as $$
declare
  v_role  text;
  v_count integer;
begin
  update challenge_members
    set warning_count = warning_count + 1
    where challenge_id = p_challenge_id and user_id = p_user
    returning warning_count, role into v_count, v_role;

  if v_count is null then
    raise exception 'member not found';
  end if;

  insert into warning_log (challenge_id, user_id, reason) values (p_challenge_id, p_user, p_reason);

  insert into notifications (user_id, challenge_id, type, message, read)
  select p_user, p_challenge_id, 'warning',
         format('''%s'' 챌린지에서 경고를 받았어요. (%s회)', title, v_count), false
  from challenges where id = p_challenge_id;

  if v_count >= 3 then
    if v_role = 'owner' then
      -- 남은 활성 멤버 전원에게 참여 포인트(2P) 환불
      perform adjust_points(cm.user_id, 2, 'owner_evicted_refund', '모임장 퇴출로 인한 참여 포인트 환불', p_challenge_id)
        from challenge_members cm
        where cm.challenge_id = p_challenge_id
          and cm.user_id <> p_user
          and cm.status = 'active';

      update challenge_members set status = 'kicked' where challenge_id = p_challenge_id and user_id = p_user;

      if exists (select 1 from challenges where id = p_challenge_id and sub_owner_id is not null) then
        insert into succession_requests (challenge_id, offered_to)
        select id, sub_owner_id from challenges where id = p_challenge_id;

        insert into notifications (user_id, challenge_id, type, message, read)
        select sub_owner_id, id, 'succession_offer',
               format('''%s'' 모임장이 퇴출되어 운영을 맡아주실 수 있는지 문의드려요.', title), false
        from challenges where id = p_challenge_id;
      else
        insert into notifications (user_id, challenge_id, type, message, read)
        select cm.user_id, p_challenge_id, 'owner_evicted',
               format('''%s'' 모임장이 퇴출되었어요. 운영을 맡아줄 참여자를 찾고 있어요.', c.title), false
        from challenge_members cm join challenges c on c.id = p_challenge_id
        where cm.challenge_id = p_challenge_id and cm.status = 'active' and cm.user_id <> p_user;
      end if;

      update profiles
        set owner_penalty_count = owner_penalty_count + 1,
            owner_restricted_until = case owner_penalty_count + 1
              when 1 then current_date + interval '1 week'
              when 2 then current_date + interval '2 week'
              else current_date + interval '1 month'
            end
        where id = p_user;
    else
      update challenge_members set status = 'kicked' where challenge_id = p_challenge_id and user_id = p_user;

      insert into notifications (user_id, challenge_id, type, message, read)
      select p_user, p_challenge_id, 'kicked',
             format('''%s'' 챌린지에서 경고 누적으로 퇴출되었어요.', title), false
      from challenges where id = p_challenge_id;
    end if;
  end if;
end;
$$;

grant execute on function apply_warning(bigint, uuid, text) to anon, authenticated;

-- 서비스 탈퇴: 개설한 모임 삭제(cascade) + 참여 중인 다른 모임은 자진 하차 + 포인트 소멸
create or replace function withdraw_account(p_user uuid) returns void
language plpgsql
security definer
as $$
begin
  update challenge_members
    set status = 'gave_up', gave_up_at = now()
    where user_id = p_user
      and status = 'active'
      and challenge_id not in (select id from challenges where created_by = p_user);

  delete from challenges where created_by = p_user;

  update profiles set points = 0 where id = p_user;
end;
$$;

grant execute on function withdraw_account(uuid) to anon, authenticated;
