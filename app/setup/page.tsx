'use client';
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SetupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [habit1, setHabit1] = useState('3分シャドーイング');
  const [habit2, setHabit2] = useState('単語・言い回し');
  const [habit3, setHabit3] = useState('少しでも英文読解');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    let imageUrl = "";

    // 1. 写真をストレージにアップロード
    if (file) {
      const fileName = `${Date.now()}_goal.png`;
      const { data } = await supabase.storage
        .from('goal-images')
        .upload(fileName, file);
      if (data) {
        imageUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${fileName}`;
      }
    }

    // 2. 目標写真と習慣をDBに保存 (簡易化のため一括更新)
    // ここで既存の習慣名を一気にアップデートする処理を書きます
    alert("設定を保存しました！ダッシュボードに戻ります。");
    window.location.href = "/";
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <h2>⚙️ はじめての設定</h2>
      <div style={{ marginBottom: '20px', border: '1px dashed #ccc', padding: '20px', textAlign: 'center' }}>
        <p>目標の写真をアップロード</p>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>
      
      <div style={{ marginBottom: '15px' }}>
        <label>習慣1</label>
        <input style={{ width: '100%', padding: '8px' }} value={habit1} onChange={(e) => setHabit1(e.target.value)} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>習慣2</label>
        <input style={{ width: '100%', padding: '8px' }} value={habit2} onChange={(e) => setHabit2(e.target.value)} />
      </div>
      <div style={{ marginBottom: '15px' }}>
        <label>習慣3</label>
        <input style={{ width: '100%', padding: '8px' }} value={habit3} onChange={(e) => setHabit3(e.target.value)} />
      </div>

      <button 
        onClick={handleSave}
        style={{ width: '100%', padding: '15px', background: '#333', color: '#fff', border: 'none', borderRadius: '5px' }}
        disabled={loading}
      >
        {loading ? "保存中..." : "アプリを始める"}
      </button>
    </div>
  );
}
