import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: 'ActNexus',
  description: 'Gerenciamento de Atos Notariais com IA',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="font-body antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
