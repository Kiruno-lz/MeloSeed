import './globals.css';
import { Providers } from './providers';
import { ToastProvider } from '@/components/Toast';

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
        <Providers>
          <ToastProvider>
            {children}
          </ToastProvider>
        </Providers>
      </body>
    </html>
  );
}
