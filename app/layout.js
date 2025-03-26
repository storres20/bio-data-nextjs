import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '@/context/AuthContext';
import Navbar from '@/components/Navbar';

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: 'Bio-Data',
  description: 'IoT Monitoring App',
};

export default function RootLayout({ children }) {
  return (
      <html lang="en">
      <body>
      <AuthProvider>
        <Navbar />
        {children}
      </AuthProvider>
      </body>
      </html>
  );
}
