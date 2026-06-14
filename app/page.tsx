import React from 'react';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type Habit = {
  habit_id: string;
  user_id: string;
  goal_text: string;
  is_active: boolean;
};

type GoalSettings = {
  user_id: string;
  goal_slogan?: string | null;
  target_days?: number | null;
};

type DailyLog = {
  habit_id: string;
  logged_date: string;
  status: boolean;
  duration?: number | null;
};

const FIXED_MINUTES_PER_TASK = 5;

function getJstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000);
}

function formatDateString(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getPrevMonth(year: number, month: number) {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

function getNextMonth(year: number, month: number) {
  if (month === 12) return { year: year + 1, month: 1 };
  return { year, month: month + 1 };
}

function calculateHabitStreak(logs: DailyLog[], habitId: string) {
  const doneDates = new Set(
    logs
      .filter((log) => String(log.habit_id) === String(habitId) && log.status === true)
      .map((log) => log.logged_date)
  );

  const jstNow = getJstNow();
  let streak = 0;
  const cursor = new Date(
    Date.UTC(jstNow.getUTCFullYear(), jstNow.getUTCMonth(), jstNow.getUTCDate())
  );

  while (true) {
    const dateStr = cursor.toISOString().split('T')[0];

    if (doneDates.has(dateStr)) {
      streak += 1;
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      continue;
    }

    if (streak === 0) {
      cursor.setUTCDate(cursor.getUTCDate() - 1);
      const yesterdayStr = cursor.toISOString().split('T')[0];
      if (doneDates.has(yesterdayStr)) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
    }
    break;
  }

  return streak;
}

function buildHabitCalendar(logs: DailyLog[], habitId: string, year: number, month: number) {
  const doneDates = new Set(
    logs
      .filter(
        (log) =>
          String(log.habit_id) === String(habitId) &&
          log.status === true &&
          typeof log.logged_date === 'string' &&
          log.logged_date.startsWith(`${year}-${String(month).padStart(2, '0')}-`)
      )
      .map((log) => log.logged_date)
  );

  const daysInMonth = getDaysInMonth(year, month);

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = formatDateString(year, month, day);
    return {
      day,
      done: doneDates.has(dateStr),
    };
  });
}

function buildMonthSummary(logs: DailyLog[], year: number, month: number) {
  const monthPrefix = `${year}-${String(month).padStart(2, '0')}-`;
  const doneDates = new Set(
    logs
      .filter((log) => log.status === true && log.logged_date?.startsWith(monthPrefix))
      .map((log) => log.logged_date)
  );

  const daysInMonth = getDaysInMonth(year, month);

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = formatDateString(year, month, day);
    return {
      day,
      done: doneDates.has(dateStr),
    };
  });
}

export default async function Home({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const jstNow = getJstNow();

  const displayYear = Number(searchParams?.year) || jstNow.getUTCFullYear();
  const displayMonth = Number(searchParams?.month) || jstNow.getUTCMonth() + 1;

  const { year: prevYear, month: prevMonth } = getPrevMonth(displayYear, displayMonth);
  const { year: nextYear, month: nextMonth } = getNextMonth(displayYear, displayMonth);

  const [
    { data: usersData },
    { data: habitsData },
    { data: goalSettingsData },
    { data: allLogsData },
    { data: filesData },
  ] = await Promise.all([
    supabase.from('users').select('user_id').limit(1),
    supabase.from('habits').select('*').eq('is_active', true).limit(3),
    supabase.from('goal_settings').select('*').limit(1),
    supabase.from('daily_logs').select('habit_id, logged_date, status, duration'),
    supabase.storage.from('goal-images').list('', {
      limit: 1,
      sortBy: { column: 'created_at', order: 'desc' },
    }),
  ]);

  const currentUserId = usersData?.[0]?.user_id || '';
  const habits = ((habitsData || []) as Habit[]).filter((h) =>
    currentUserId ? String(h.user_id) === String(currentUserId) : true
  );
  const goal = (goalSettingsData?.[0] || null) as GoalSettings | null;
  const allLogs = (allLogsData || []) as DailyLog[];

  const filteredLogs = currentUserId
    ? allLogs.filter((log: any) => {
        if ('user_id' in log && log.user_id) {
          return String(log.user_id) === String(currentUserId);
        }
        return true;
      })
    : allLogs;

  const dailyTargetMinutes = habits.length * FIXED_MINUTES_PER_TASK;

  const totalMinutes = filteredLogs
    .filter((log) => log.status === true)
    .reduce((sum, log) => {
      const rawDuration = Number(log.duration ?? 0);
      if (rawDuration > 0) return sum + rawDuration;
      return sum + FIXED_MINUTES_PER_TASK;
    }, 0);

  const targetDays = Number(goal?.target_days ?? 90);
  const goalTotalMinutes = Math.max(targetDays * dailyTargetMinutes, 1);
  const progressPercent = Math.min(
    Math.round((totalMinutes / goalTotalMinutes) * 100),
    100
  );

  const goalImageUrl =
    filesData?.[0]?.name && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${filesData[0].name}`
      : null;

  const combinedMonthCalendar = buildMonthSummary(filteredLogs, displayYear, displayMonth);

  const shareUrl =
    'https://social-plugins.line.me/lineit/share?url=' +
    encodeURIComponent('https://my-habit-app-sigma.vercel.app/');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F8F9FC',
        padding: '24px 16px 64px',
        color: '#1E293B',
        fontFamily:
          '"Noto Sans JP", "Hiragino Sans", "Inter", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
            gap: '12px',
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: '2rem',
              fontWeight: 800,
              letterSpacing: '0.04em',
            }}
          >
            モチベーター
          </h1>

          <a
            href="/setup"
            style={{
              textDecoration: 'none',
              background: '#FFFFFF',
              color: '#1E293B',
              padding: '12px 18px',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              fontWeight: 700,
              fontSize: '0.92rem',
              whiteSpace: 'nowrap',
            }}
          >
            ⚙️ 設定・目標変更
          </a>
        </header>

        <section
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '12px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
            marginBottom: '16px',
          }}
        >
          {goalImageUrl ? (
            <img
              src={goalImageUrl}
              alt="目標写真"
              style={{
                width: '100%',
                height: '220px',
                objectFit: 'cover',
                borderRadius: '20px',
                display: 'block',
              }}
            />
          ) : (
            <div
              style={{
                height: '220px',
                borderRadius: '20px',
                background: '#F1F5F9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94A3B8',
                fontWeight: 700,
              }}
            >
              目標写真を設定してください
            </div>
          )}
        </section>

        <section
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
            marginBottom: '20px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '0.82rem',
              color: '#64748B',
              fontWeight: 700,
              marginBottom: '10px',
              letterSpacing: '0.08em',
            }}
          >
            MAIN GOAL
          </div>
          <div
            style={{
              fontSize: '1.28rem',
              lineHeight: 1.6,
              fontWeight: 800,
            }}
          >
            {goal?.goal_slogan || '目標を設定してください'}
          </div>
          <div
            style={{
              marginTop: '12px',
              display: 'inline-block',
              background: '#FFECEC',
              color: '#E84A4A',
              padding: '8px 14px',
              borderRadius: '999px',
              fontWeight: 700,
              fontSize: '0.9rem',
            }}
          >
            目標期間: {targetDays}日
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '16px',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
            }}
          >
            <div
              style={{
                fontSize: '0.78rem',
                color: '#64748B',
                fontWeight: 800,
                letterSpacing: '0.08em',
                marginBottom: '10px',
              }}
            >
              総努力時間
            </div>

            <div
              style={{
                fontSize: '2.1rem',
                fontWeight: 800,
                color: '#E84A4A',
                lineHeight: 1.1,
              }}
            >
              {totalMinutes.toLocaleString()}
            </div>

            <div
              style={{
                marginTop: '6px',
                color: '#94A3B8',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              分
            </div>
          </div>

          <div
            style={{
              background: '#FFFFFF',
              borderRadius: '24px',
              padding: '24px',
              boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '14px',
                gap: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '0.78rem',
                  color: '#64748B',
                  fontWeight: 800,
                  letterSpacing: '0.08em',
                }}
              >
                目標への進捗
              </div>

              <div
                style={{
                  background: '#FFECEC',
                  color: '#E84A4A',
                  padding: '6px 12px',
                  borderRadius: '999px',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                }}
              >
                {progressPercent}%
              </div>
            </div>

            <div
              style={{
                width: '100%',
                height: '10px',
                background: '#E2E8F0',
                borderRadius: '999px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: '#E84A4A',
                  borderRadius: '999px',
                }}
              />
            </div>

            <div
              style={{
                marginTop: '10px',
                fontSize: '0.88rem',
                color: '#64748B',
                fontWeight: 600,
              }}
            >
              目標合計 {goalTotalMinutes.toLocaleString()} 分
              （{targetDays}日 × 1日 {dailyTargetMinutes}分）
            </div>
          </div>
        </section>

        <section
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '20px 24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <a
              href={`/?year=${prevYear}&month=${prevMonth}&t=${Date.now()}`}
              style={{
                textDecoration: 'none',
                color: '#64748B',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              ←
            </a>

            <div
              style={{
                fontSize: '1.9rem',
                fontWeight: 800,
                letterSpacing: '0.03em',
              }}
            >
              {displayYear}.{displayMonth}
            </div>

            <a
              href={`/?year=${nextYear}&month=${nextMonth}&t=${Date.now()}`}
              style={{
                textDecoration: 'none',
                color: '#64748B',
                fontWeight: 800,
                fontSize: '1.2rem',
              }}
            >
              →
            </a>
          </div>
        </section>

        <section
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              fontSize: '0.85rem',
              color: '#64748B',
              fontWeight: 800,
              marginBottom: '16px',
              letterSpacing: '0.08em',
            }}
          >
            今月の全体カレンダー（どれか1つでも達成で○）
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '10px',
            }}
          >
            {combinedMonthCalendar.map((item) => (
              <div
                key={item.day}
                style={{
                  minHeight: '58px',
                  borderRadius: '16px',
                  background: item.done ? '#FFECEC' : '#F8F9FC',
                  border: `1px solid ${item.done ? '#FFD4D4' : '#E2E8F0'}`,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: item.done ? '#E84A4A' : '#64748B',
                  fontWeight: 800,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '10px',
                    fontSize: '0.74rem',
                    color: '#94A3B8',
                    fontWeight: 700,
                  }}
                >
                  {item.day}
                </span>

                {item.done ? (
                  <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>○</span>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gap: '20px' }}>
          {habits.map((habit, index) => {
            const calendar = buildHabitCalendar(
              filteredLogs,
              String(habit.habit_id),
              displayYear,
              displayMonth
            );
            const streak = calculateHabitStreak(filteredLogs, String(habit.habit_id));

            return (
              <article
                key={habit.habit_id}
                style={{
                  background: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '24px',
                  boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    marginBottom: '18px',
                  }}
                >
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      background: '#FFECEC',
                      color: '#E84A4A',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1rem',
                      border: '1px solid #FFD4D4',
                      flexShrink: 0,
                    }}
                  >
                    {index + 1}
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '1.08rem',
                        fontWeight: 800,
                        marginBottom: '2px',
                      }}
                    >
                      {habit.goal_text}
                    </div>
                    <div
                      style={{
                        fontSize: '0.88rem',
                        color: '#64748B',
                        fontWeight: 600,
                      }}
                    >
                      1回 5分
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(7, 1fr)',
                    gap: '10px',
                  }}
                >
                  {calendar.map((item) => (
                    <div
                      key={item.day}
                      style={{
                        minHeight: '58px',
                        borderRadius: '16px',
                        background: item.done ? '#FFECEC' : '#F8F9FC',
                        border: `1px solid ${item.done ? '#FFD4D4' : '#E2E8F0'}`,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: item.done ? '#E84A4A' : '#64748B',
                        fontWeight: 800,
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '10px',
                          fontSize: '0.74rem',
                          color: '#94A3B8',
                          fontWeight: 700,
                        }}
                      >
                        {item.day}
                      </span>

                      {item.done ? (
                        <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>○</span>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    marginTop: '18px',
                    display: 'flex',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      background: '#F8F9FC',
                      border: '1px solid #E2E8F0',
                      borderRadius: '999px',
                      padding: '10px 18px',
                      fontWeight: 800,
                      color: '#1E293B',
                    }}
                  >
                    🔥 {streak}日連続達成中
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <footer style={{ marginTop: '28px' }}>
          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              width: '100%',
              height: '62px',
              background: '#06C755',
              color: '#FFFFFF',
              borderRadius: '20px',
              fontWeight: 800,
              fontSize: '1rem',
              boxShadow: '0 10px 24px rgba(6, 199, 85, 0.18)',
            }}
          >
            お友達にアプリを紹介する
          </a>
        </footer>
      </div>
    </main>
  );
}
