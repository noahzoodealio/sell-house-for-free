import "server-only";

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import {
  formatOfferRange,
  type TeamMemberNotificationProps,
} from "../dynamic-data";

// Internal transactional template — NO unsubscribe link, NO three-part
// disclaimer, NO marketing chrome. This is the only surface with seller
// PII exposed in email form.

export function TeamMemberNotification(props: TeamMemberNotificationProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{`New lead: ${props.sellerFullName} — ${props.propertyCity}, ${props.propertyState}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={headingStyle}>
            New lead assigned to you
          </Heading>
          <Text style={leadText}>
            {props.teamMemberFirstName}, you&apos;ve been assigned to a new
            submission. Details below.
          </Text>

          <Hr style={hrStyle} />

          <Section style={fieldsSection}>
            <FieldRow label="Seller" value={props.sellerFullName} />
            <FieldRow label="Email" value={props.sellerEmail} />
            {props.sellerPhone ? (
              <FieldRow label="Phone" value={props.sellerPhone} />
            ) : null}
            <FieldRow
              label="Property"
              value={`${props.propertyAddress}, ${props.propertyCity}, ${props.propertyState} ${props.propertyZip}`}
            />
            <FieldRow
              label="Interested in"
              value={props.sellerPaths.join(", ") || "—"}
            />
            {props.timeline ? (
              <FieldRow label="Timeline" value={props.timeline} />
            ) : null}
            {props.pillarHint ? (
              <FieldRow label="Pillar hint" value={props.pillarHint} />
            ) : null}
            <FieldRow label="Submission ref" value={props.submissionRef} />
          </Section>

          {props.offers.length > 0 ? (
            <Section style={offersSection}>
              <Text style={offersHeading}>Offervana paths</Text>
              {props.offers.map((o) => (
                <FieldRow
                  key={o.path}
                  label={o.path}
                  value={formatOfferRange(o.lowCents, o.highCents)}
                />
              ))}
            </Section>
          ) : null}

          <Hr style={hrStyle} />

          <Text style={smallText}>
            This is an internal transactional notification. Do not forward
            outside the team.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <Text style={fieldRow}>
      <strong style={fieldLabel}>{label}</strong>
      {value}
    </Text>
  );
}

const bodyStyle = {
  backgroundColor: "#ffffff",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const containerStyle = {
  margin: "0 auto",
  padding: "24px",
  maxWidth: "600px",
};

const headingStyle = {
  fontSize: "22px",
  color: "#111827",
  margin: "0 0 8px",
};

const leadText = {
  fontSize: "14px",
  color: "#475569",
  lineHeight: "20px",
};

const fieldsSection = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
};

const offersSection = {
  margin: "12px 0",
  padding: "12px 20px",
  border: "1px solid #e2e8f0",
  borderRadius: "8px",
};

const offersHeading = {
  fontSize: "14px",
  fontWeight: "600",
  color: "#111827",
  margin: "0 0 8px",
};

const fieldRow = {
  fontSize: "14px",
  color: "#111827",
  margin: "6px 0",
  lineHeight: "20px",
};

const fieldLabel = {
  display: "inline-block",
  width: "120px",
  color: "#475569",
  fontWeight: "500",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const smallText = {
  fontSize: "12px",
  color: "#94a3b8",
  lineHeight: "18px",
};
