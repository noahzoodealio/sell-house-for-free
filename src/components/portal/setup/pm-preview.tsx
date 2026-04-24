import type { PmPreview as PmPreviewShape } from "@/lib/pm-service";

// Server Component — no client-side JS. Renders the assigned team
// member's first name + photo (or initials fallback) above the polling
// island. Type intentionally refuses to accept email/phone; the
// upstream AssignmentView doesn't carry them into this slot.

interface PmPreviewProps {
  pm: PmPreviewShape;
  contactWindowHours: number;
}

export function PmPreview({ pm, contactWindowHours }: PmPreviewProps) {
  const initials = pm.firstName.slice(0, 1).toUpperCase();
  return (
    <section
      aria-labelledby="pm-preview-heading"
      className="pm-preview"
      style={pmPreviewSection}
    >
      <div style={avatarWrap}>
        {pm.photoUrl ? (
          <img
            src={pm.photoUrl}
            alt=""
            aria-hidden="true"
            width={64}
            height={64}
            style={photoStyle}
          />
        ) : (
          <span style={initialStyle} aria-hidden="true">
            {initials}
          </span>
        )}
      </div>
      <div>
        <p style={eyebrowStyle}>Your Project Manager</p>
        <h2 id="pm-preview-heading" style={nameStyle}>
          {pm.firstName}
        </h2>
        <p style={commitmentStyle}>
          {pm.firstName} will reach out within {contactWindowHours}{" "}
          {contactWindowHours === 1 ? "hour" : "hours"}.
        </p>
      </div>
    </section>
  );
}

const pmPreviewSection: React.CSSProperties = {
  display: "flex",
  gap: 16,
  alignItems: "center",
  padding: "20px 24px",
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  margin: "0 0 24px",
};

const avatarWrap: React.CSSProperties = {
  flex: "0 0 auto",
};

const photoStyle: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: "50%",
  objectFit: "cover",
};

const initialStyle: React.CSSProperties = {
  display: "inline-flex",
  width: 64,
  height: 64,
  borderRadius: "50%",
  backgroundColor: "#cbd5e1",
  color: "#1e293b",
  fontWeight: 600,
  fontSize: 28,
  alignItems: "center",
  justifyContent: "center",
};

const eyebrowStyle: React.CSSProperties = {
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "#475569",
  margin: "0 0 4px",
};

const nameStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 600,
  color: "#111827",
  margin: "0 0 4px",
};

const commitmentStyle: React.CSSProperties = {
  fontSize: 14,
  color: "#475569",
  margin: 0,
};
