import { DM_Mono } from "next/font/google";
import "./globals.css";
import ClerkWrapper from "./ClerkWrapper";

const dmMono = DM_Mono({
  weight: ["400", "500"],
  variable: "--font-dm-mono",
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
        className={`${dmMono.variable} antialiased bg-[#060606] text-zinc-100 font-mono`}
      >
        <ClerkWrapper>{children}</ClerkWrapper>
      </body>
    </html>
  );
}
