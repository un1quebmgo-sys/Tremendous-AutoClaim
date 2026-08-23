import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tremendous AutoClaim",
  description: "Extract Tremendous reward links from Outlook and Gmail inboxes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-900 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
