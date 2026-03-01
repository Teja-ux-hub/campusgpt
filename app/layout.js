import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClerkWrapper from "./ClerkWrapper";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "CampusGPT",
  description: "Ask your documents like a pro, powered by Gemini and Pinecone.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-br from-black via-zinc-950 to-zinc-900 text-zinc-100`}
      >
        <ClerkWrapper>{children}</ClerkWrapper>
      </body>
    </html>
  );
}
