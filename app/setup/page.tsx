'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type HabitInput = {
  title: string;
  mins: string;
};

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  const [goalSlogan, setGoalSlogan] = useState(
    'TOEFL90点を取得 / 3か月後の会議でネイティブとやり合える'
  );
  const [targetDays, setTargetDays] = useState('90');

  const [habit1, setHabit1] = useState<HabitInput>({
    title: 'TED',
    mins: '15',
  });
  const [habit2, setHabit2] = useState<HabitInput>({
    title: '単語',
    mins: '15',
  });
  const [habit3, setHabit3] = useState<HabitInput>({
    title: 'インプット',
    mins: '15',
  });

  const habits = useMemo(
    () => [habit1, habit2, habit3],
    [habit1, habit2, habit3]
  );

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [{ data: usersData }, { data: goalData }, { data: filesData }] =
          await Promise.all([
            supabase.from('users').select('user_id').limit(1),
            supabase.from('goal_settings').select('*').limit(1),
            supabase.storage.from('goal-images').list('', {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' },
            }),
          ]);

        const userId = usersData?.[0]?.user_id;

        if (goalData?.[0]) {
          setGoalSlogan(goalData[0].goal_slogan || '');
          setTargetDays(String(goalData[0].target_days || 90));
        }

        if (userId) {
          const { data: habitsData } = await supabase
            .from('habits')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(3);

          if (habitsData?.[0]) {
            setHabit1({
              title: habitsData[0].goal_text || '',
              mins: String(habitsData[0].target_minutes ?? 15),
            });
          }
          if (habitsData?.[1]) {
            setHabit2({
              title: habitsData[1].goal_text || '',
              mins: String(habitsData[1].target_minutes ?? 15),
            });
          }
          if (habitsData?.[2]) {
            setHabit3({
              title: habitsData[2].goal_text || '',
              mins: String(habitsData[2].target_minutes ?? 15),
            });
          }
        }

        if (
          filesData?.[0]?.name &&
          process.env.NEXT_PUBLIC_SUPABASE_URL
        ) {
          setPreviewUrl(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${filesData[0].name}`
          );
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoadingInitial(false);
      }
    };

    loadInitialData();
  }, []);

  const handleFileChange = (selectedFile: File | null) => {
    setFile(selectedFile || null);

    if (selectedFile) {
      const localPreview = URL.createObjectURL(selectedFile);
      setPreviewUrl(localPreview);
    }
  };

  const handleSave = async () => {
    if (loading) return;

    const cleanedHabits = habits.map((habit) => ({
      title: habit.title.trim(),
      mins: habit.mins.trim(),
    }));

    if (!goalSlogan.trim()) {
      alert('メイン目標を入力してください');
      return;
    }

    if (!targetDays.trim()) {
      alert('目標達成までの日数を入力してください');
      return;
    }

    if (cleanedHabits.some((habit) => !habit.title || !habit.mins)) {
      alert('3つの習慣名と分数をすべて入力してください');
      return;
    }

    setLoading(true);

    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('user_id')
        .limit(1);

      if (usersError || !usersData?.[0]?.user_id) {
        throw new Error('users テーブルの user_id を取得できませんでした');
      }

      const userId = usersData[0].user_id;

      // 画像アップロード
      if (file) {
        const safeName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const { error: uploadError } = await supabase.storage
          .from('goal-images')
          .upload(safeName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }
      }

      // goal_settings 保存
      const { error: goalError } = await supabase
        .from('goal_settings')
        .upsert(
          [
            {
              user_id: userId,
              goal_slogan: goalSlogan.trim(),
              target_days: Number(targetDays),
            },
          ],
          { onConflict: 'user_id' }
        );

      if (goalError) {
        throw goalError;
      }

      // 既存習慣取得
      const { data: existingHabits, error: existingHabitsError } = await supabase
        .from('habits')
        .select('habit_id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(3);

      if (existingHabitsError) {
        throw existingHabitsError;
      }

      const setters = [habit1, habit2, habit3];

      for (let i = 0; i < 3; i++) {
        const currentHabit = setters[i];
        const payload = {
          user_id: userId,
          goal_text: currentHabit.title.trim(),
          target_minutes: Number(currentHabit.mins),
          is_active: true,
        };

        const existingHabitId = existingHabits?.[i]?.habit_id;

        if (existingHabitId) {
          const { error: updateError } = await supabase
            .from('habits')
            .update(payload)
            .eq('habit_id', existingHabitId);

          if (updateError) {
            throw updateError;
          }
        } else {
          const { error: insertError } = await supabase
            .from('habits')
            .insert(payload);

          if (insertError) {
            throw insertError;
          }
        }
      }

      alert('設定を保存しました');
      window.location.href = `/?refresh=${Date.now()}`;
    } catch (error) {
      console.error(error);
      alert(
        '保存エラーが発生しました。goal_settings の user_id 一意制約、habits.target_minutes 列、Storage policy を確認してください。'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#F8F9FC',
        padding: '24px 16px 48px',
        color: '#1E293B',
        fontFamily:
          '"Noto Sans JP", "Hiragino Sans", "Inter", system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
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
            モチベーター 設定
          </h1>

          <a
            href="/"
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
            ← ダッシュボードへ
          </a>
        </header>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: '24px',
            padding: '24px',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
          }}
        >
          {loadingInitial ? (
            <div
              style={{
                padding: '40px 0',
                textAlign: 'center',
                color: '#64748B',
                fontWeight: 700,
              }}
            >
              読み込み中...
            </div>
          ) : (
            <>
              {/* Photo */}
              <section style={{ marginBottom: '24px' }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748B',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    marginBottom: '10px',
                  }}
                >
                  目標写真
                </div>

                <div
                  style={{
                    border: '2px dashed #E2E8F0',
                    borderRadius: '20px',
                    padding: '16px',
                    background: '#F8F9FC',
                  }}
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="preview"
                      style={{
                        width: '100%',
                        height: '220px',
                        objectFit: 'cover',
                        borderRadius: '16px',
                        display: 'block',
                        marginBottom: '12px',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: '220px',
                        borderRadius: '16px',
                        background: '#FFFFFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8',
                        fontWeight: 700,
                        marginBottom: '12px',
                      }}
                    >
                      ここに目標写真が表示されます
                    </div>
                  )}

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                    style={{ width: '100%' }}
                  />
                </div>
              </section>

              {/* Main goal */}
              <section style={{ marginBottom: '20px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 800,
                  }}
                >
                  目標
                </label>
                <input
                  value={goalSlogan}
                  onChange={(e) => setGoalSlogan(e.target.value)}
                  placeholder="例: TOEFL90点を取得 / 3か月後の会議でネイティブとやり合える"
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    padding: '0 14px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </section>

              {/* Target days */}
              <section style={{ marginBottom: '24px' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontWeight: 800,
                  }}
                >
                  目標達成までの日数
                </label>
                <input
                  type="number"
                  value={targetDays}
                  onChange={(e) => setTargetDays(e.target.value)}
                  placeholder="90"
                  style={{
                    width: '100%',
                    height: '52px',
                    borderRadius: '14px',
                    border: '1px solid #E2E8F0',
                    padding: '0 14px',
                    fontSize: '1rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </section>

              {/* Habits */}
              <section style={{ marginBottom: '8px' }}>
                <div
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748B',
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    marginBottom: '12px',
                  }}
                >
                  各タスクの時間（分）
                </div>

                {[
                  { label: '習慣1', value: habit1, setter: setHabit1 },
                  { label: '習慣2', value: habit2, setter: setHabit2 },
                  { label: '習慣3', value: habit3, setter: setHabit3 },
                ].map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 120px',
                      gap: '12px',
                      marginBottom: '14px',
                    }}
                  >
                    <div>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontWeight: 700,
                        }}
                      >
                        {item.label} 名前
                      </label>
                      <input
                        value={item.value.title}
                        onChange={(e) =>
                          item.setter({
                            ...item.value,
                            title: e.target.value,
                          })
                        }
                        placeholder="例: TED"
                        style={{
                          width: '100%',
                          height: '52px',
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          padding: '0 14px',
                          fontSize: '1rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: 'block',
                          marginBottom: '8px',
                          fontWeight: 700,
                        }}
                      >
                        分
                      </label>
                      <input
                        type="number"
                        value={item.value.mins}
                        onChange={(e) =>
                          item.setter({
                            ...item.value,
                            mins: e.target.value,
                          })
                        }
                        placeholder="15"
                        style={{
                          width: '100%',
                          height: '52px',
                          borderRadius: '14px',
                          border: '1px solid #E2E8F0',
                          padding: '0 14px',
                          fontSize: '1rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </section>

              <button
                onClick={handleSave}
                disabled={loading}
                style={{
                  width: '100%',
                  height: '58px',
                  border: 'none',
                  borderRadius: '18px',
                  background: loading ? '#CBD5E1' : '#E84A4A',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1rem',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '20px',
                  boxShadow: '0 10px 24px rgba(232, 74, 74, 0.18)',
                }}
              >
                {loading ? '保存中...' : '保存してダッシュボードへ'}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
