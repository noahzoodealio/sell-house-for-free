"use client";

import { useEffect } from "react";

export function FaqHashTarget() {
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el instanceof HTMLDetailsElement) el.open = true;
  }, []);
  return null;
}
