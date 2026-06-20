import type { Metadata } from 'next'
import { Inter, Lobster, Orbitron } from 'next/font/google'
import './globals.css'
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const lobster = Lobster({ subsets: ['latin'], weight: '400', variable: '--font-vintage' })
const orbitron = Orbitron({ subsets: ['latin'], weight: ['500', '600', '700', '800', '900'], variable: '--font-nano' })

export const metadata: Metadata = {
  title: 'FlowCart Sync',
  description: 'Order Management System for FlowCart Sync',
  icons: {
    icon: '/images/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var m=localStorage.getItem('theme');var c=localStorage.getItem('colorTheme');var d=document.documentElement;if(m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches)){d.classList.add('dark');}if(c&&c!=='gold'){d.setAttribute('data-color',c);}}catch(e){}})();` }} />
      </head>
      <body className={cn(inter.variable, lobster.variable, orbitron.variable, "font-body antialiased")} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
