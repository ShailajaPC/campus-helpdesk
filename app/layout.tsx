import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Campus Help Desk",
  description: "A community board for campus questions and help requests.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
