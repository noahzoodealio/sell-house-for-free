import { CopyButton } from "./copy-button";

// Server Component — renders the submission reference code with a
// thin 'use client' CopyButton micro-island. The code itself is just
// text; only the copy-to-clipboard interaction needs JS.

interface SubmissionRefProps {
  referralCode: string;
}

export function SubmissionRef({ referralCode }: SubmissionRefProps) {
  return (
    <div style={wrapper} aria-label="Submission reference code">
      <p style={label}>Reference code</p>
      <div style={row}>
        <code style={codeStyle}>{referralCode}</code>
        <CopyButton value={referralCode} />
      </div>
    </div>
  );
}

const wrapper: React.CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  margin: "0 0 24px",
};

const label: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#64748b",
  margin: "0 0 6px",
};

const row: React.CSSProperties = {
  display: "flex",
  gap: 12,
  alignItems: "center",
  justifyContent: "space-between",
};

const codeStyle: React.CSSProperties = {
  fontFamily:
    "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace",
  fontSize: 14,
  color: "#111827",
};
