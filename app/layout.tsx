import './globals.css';
import { Providers } from './providers';

export const metadata = {
  title: 'MeloSeed - On-Chain AI Music',
  description: 'Generate and Mint AI Music on Monad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
