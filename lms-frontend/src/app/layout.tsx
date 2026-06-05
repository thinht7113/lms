import type { Metadata } from "next";
import { Be_Vietnam_Pro, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/user-context";
import MainLayout from "@/components/MainLayout";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["vietnamese", "latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lumina LMS | High-Tech Education Secured",
  description: "Master modern technology skills and earn automated blockchain-verified certificates on Lumina LMS portal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${plusJakartaSans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script src="https://unpkg.com/@phosphor-icons/web" async></script>
      </head>
      <body className="min-h-full flex flex-col font-sans bg-background text-on-background" suppressHydrationWarning>
        <UserProvider>
          <MainLayout>
            {children}
          </MainLayout>
        </UserProvider>
      </body>
    </html>
  );
}
