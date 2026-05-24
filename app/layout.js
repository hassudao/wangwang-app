import './globals.css';

export const metadata = {
  title: 'WangWang - ハイブリッドSNS',
  description: 'Twitter × LINE × Instagram ハイブリッドSNSプロトタイプ',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
