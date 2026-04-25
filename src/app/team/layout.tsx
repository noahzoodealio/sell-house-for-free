import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Team — Sell Your House Free",
  robots: { index: false, follow: false },
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
