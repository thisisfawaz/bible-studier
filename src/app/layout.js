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
  description: "Daily Devotionals & Bible Study Assistant",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ background: '#101012' }}
    >
      <body className="min-h-full flex flex-col" style={{ background: '#101012' }}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var el = document.getElementById('__next');
                if (el) {
                  el.classList.add('loaded');
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}