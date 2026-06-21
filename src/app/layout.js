import { ClerkProvider } from "@clerk/nextjs";

import { hasClerkCredentials } from "@/lib/clerk-config";
import RaidNotificationsGlobal from "@/components/raid-notifications";

import "./globals.css";

export const metadata = {
  title: "DebugBattle — Debug AI. Become a Bug Slayer.",
  description:
    "Competitive arena where engineers hunt security flaws, performance bottlenecks, and ethical violations in real code. Five categories, one codebase, one winner.",
};

export default function RootLayout({ children }) {
  const app = hasClerkCredentials() ? (
    <ClerkProvider>
      {children}
      <RaidNotificationsGlobal />
    </ClerkProvider>
  ) : children;

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{app}</body>
    </html>
  );
}
