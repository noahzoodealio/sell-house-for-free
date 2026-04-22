import type { ReactNode } from "react";

export default function GetStartedLayout({ children }: { children: ReactNode }) {
  return <main id="main">{children}</main>;
}
