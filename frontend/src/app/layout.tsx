import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { WalletProvider } from "@/providers/WalletProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ChainMate — Decentralized Chess Tournament Platform",
  description:
    "Manage chess tournaments with entry fees, prize pools, and automatic payouts powered by Stellar Soroban smart contracts.",
  keywords: [
    "chess",
    "tournament",
    "stellar",
    "soroban",
    "blockchain",
    "decentralized",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased dark`}
    >
      <body className="flex min-h-full flex-col bg-zinc-950 font-[family-name:var(--font-inter)] text-white">
        <WalletProvider>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
