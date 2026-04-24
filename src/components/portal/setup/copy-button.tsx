"use client";

import { useState } from "react";

// Thin client micro-island — copy-to-clipboard only. Kept separate
// from <SubmissionRef> so the page root stays a Server Component.

interface CopyButtonProps {
  value: string;
}

export function CopyButton({ value }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Ignore clipboard errors — user can still select the text manually.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={copied ? "Copied" : "Copy reference code"}
      style={buttonStyle}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}

const buttonStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 500,
  padding: "4px 10px",
  backgroundColor: "#f1f5f9",
  color: "#1e293b",
  border: "1px solid #cbd5e1",
  borderRadius: 6,
  cursor: "pointer",
};
