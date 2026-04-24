// Server Component — renders when no assignment row exists yet for
// the referral code (or when the ref param is missing/malformed). This
// is a happy-path fallback, NOT an error surface: the orchestrator's
// best-effort posture means a slow Supabase may leave the row unwritten
// when the user lands here; the seller still sees a reassuring
// "we'll reach out" commitment.

interface FallbackMessageProps {
  contactWindowHours: number;
}

export function FallbackMessage({ contactWindowHours }: FallbackMessageProps) {
  return (
    <section
      aria-label="Submission received"
      style={fallbackSection}
    >
      <h2 style={headingStyle}>Submission received.</h2>
      <p style={bodyStyle}>
        Your Project Manager will reach out within {contactWindowHours}{" "}
        {contactWindowHours === 1 ? "hour" : "hours"}. Keep an eye on your
        email and phone.
      </p>
    </section>
  );
}

const fallbackSection: React.CSSProperties = {
  padding: "20px 24px",
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  margin: "0 0 24px",
};

const headingStyle: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 6px",
};

const bodyStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#475569",
  margin: 0,
  lineHeight: 1.5,
};
