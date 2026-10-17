import { Theme } from "@/lib/radix/Theme";
import "@radix-ui/themes/styles.css";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import clsx from "clsx";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import styles from "./layout.module.scss";

export const metadata: Metadata = {
  title: "Towers of Coreborn",
};

const font = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["200", "300", "400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={clsx(styles.body, font.className)}>
        <Theme className={styles.entryPoint}>
          {children}
          <Analytics />
          <SpeedInsights />
        </Theme>
      </body>
    </html>
  );
}
