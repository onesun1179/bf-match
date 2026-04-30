import type {Metadata} from "next";
import Script from "next/script";
import {PullToRefresh} from "@/components/pull-to-refresh";
import "./globals.css";

export const metadata: Metadata = {
  title: "BF Match",
  description: "배드민턴 번개와 이벤트을 연결하는 모바일 매칭 서비스",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-R0CZ8WVKYV"
          strategy="afterInteractive"
        />
        <Script id="ga-gtag-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-R0CZ8WVKYV');
          `}
        </Script>
        <PullToRefresh>{children}</PullToRefresh>
      </body>
    </html>
  );
}
