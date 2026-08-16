import './globals.css';
import { Analytics } from '@vercel/analytics/next';

export const metadata = {
  title: 'Drink Tracker',
  description: 'Track daily beverage consumption with your coworkers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
