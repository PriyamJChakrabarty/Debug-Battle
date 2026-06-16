import "./globals.css";

export const metadata = {
  title: "Debug Battle",
  description: "Practice debugging broken C++ DSA submissions with Groq-powered challenge generation.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
