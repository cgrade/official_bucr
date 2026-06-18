import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bucr - Restaurant Reservations & Takeout',
  description: 'Nigerian restaurant reservation and takeout platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
