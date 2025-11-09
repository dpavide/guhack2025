import type { Metadata } from "next";
import "./globals.css";
import LayoutClient from "@/components/LayoutClient";

export const metadata: Metadata = {
  title: "Splitr",
  description: "Full-stack application with Next.js frontend and FastAPI backend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <LayoutClient>{children}</LayoutClient>
      </body>
    </html>
  );
}
