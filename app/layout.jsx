import './globals.css';

export const metadata = {
  title: { default: 'norrvex_bucket | Recce repository', template: '%s | norrvex_bucket' },
  description: 'Your shared recce images, specifications, and mapped installations from Norrvex Partners.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
