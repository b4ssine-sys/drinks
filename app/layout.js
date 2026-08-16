import './globals.css';

export const metadata = {
  title: 'Drink Tracker',
  description: 'Track daily beverage consumption with your coworkers',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
