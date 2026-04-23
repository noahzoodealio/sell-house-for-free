import type { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return <div className="flex flex-col flex-1 min-h-0">{children}</div>;
}
