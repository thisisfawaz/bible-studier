import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Bible Studier",
  description: "Daily Devotionals, Bible Study Assistant & Message Reels",
  openGraph: {
    title: "Bible Studier",
    description: "Daily Devotionals, Bible Study Assistant & Message Reels",
    url: "/",
    siteName: "Bible Studier",
    images: [
      {
        url: "/bible.png",
        width: 722,
        height: 722,
        alt: "Bible Studier - Daily Devotionals",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bible Studier",
    description: "Daily Devotionals, Bible Study Assistant & Message Reels",
    images: ["/bible.png"],
  },
  icons: {
    icon: "/bible.png",
    shortcut: "/bible.png",
    apple: "/bible.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#101012' }}
    >
      <head>
        {/* Preload YouTube API on app startup */}
        <link rel="preconnect" href="https://www.youtube.com" />
        <link rel="preconnect" href="https://www.youtube-nocookie.com" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <script
          src="https://www.youtube.com/iframe_api"
          async
          defer
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Preload YouTube API
              if (typeof window !== 'undefined') {
                window.YT_READY = false;
                window.onYouTubeIframeAPIReady = function() {
                  window.YT_READY = true;
                  console.log('🎬 YouTube API preloaded on app startup');
                };
              }
            `
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" style={{ background: '#101012' }}>
        {children}
      </body>
    </html>
  );
}