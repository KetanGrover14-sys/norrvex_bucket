import './globals.css';

export const metadata = {
  title: { default: 'Apollo Pharmacy × Norrvex Labs | Project portal', template: '%s | Apollo Pharmacy × Norrvex Labs' },
  description: 'Apollo Pharmacy × Norrvex Labs project portal for recce images, specifications, and mapped installations.',
  robots: { index: false, follow: false },
  icons: {
    icon: { url: '/images/apollopharmacy.png', type: 'image/png' },
    apple: '/images/apollopharmacy.png',
  },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
