import { Anton, Barlow } from 'next/font/google';
import './globals.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Barlow({ weight: ['400', '500', '600', '700'], subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  title: 'Ringcraft: round-by-round boxing analysis',
  description:
    'Log your rounds or import tracker data, see where your energy goes, and get AI coaching on technique, punch selection and pacing.',
};

export const viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#edf0f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1726' },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-GB" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
