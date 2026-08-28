import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'meow map | 부산대 고양이 지도',
  description: '부산대학교 부산캠퍼스에서 발견한 고양이의 위치와 사진, 이름을 기록하는 지도',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
