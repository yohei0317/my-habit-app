import React from 'react';
export const metadata = { title: '習慣化アプリ', description: '毎日を記録するアプリ' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="ja"><body>{children}</body></html>);
}
