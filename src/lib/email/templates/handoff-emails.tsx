import "server-only";

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

const REASON_LABELS: Record<string, string> = {
  vacation: "Vacation / time off",
  expertise_mismatch: "Expertise mismatch",
  coverage_region_gap: "Coverage region gap",
  seller_request: "Seller request",
  performance_issue: "Performance issue",
  other: "Other",
};

export interface HandoffEmailProps {
  outgoingName: string;
  incomingName: string;
  sellerName: string;
  propertySummary: string;
  reason: string;
  note: string | null;
  submissionUrl: string;
}

export function HandoffOutgoing(props: HandoffEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`Handed off ${props.sellerName}'s submission to ${props.incomingName}.`}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={headingStyle}>
            Handoff confirmed
          </Heading>
          <Text style={bodyText}>
            You handed off <strong>{props.sellerName}</strong> ({props.propertySummary})
            to <strong>{props.incomingName}</strong>.
          </Text>
          <Text style={bodyText}>
            Reason: <em>{REASON_LABELS[props.reason] ?? props.reason}</em>.
            {props.note ? (
              <>
                <br />
                Note: {props.note}
              </>
            ) : null}
          </Text>
          <Text style={smallText}>
            <Link href={props.submissionUrl} style={linkStyle}>
              View the submission
            </Link>{" "}
            (read-only for you now — {props.incomingName} owns it).
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function HandoffIncoming(props: HandoffEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`${props.outgoingName} handed off ${props.sellerName} to you.`}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={headingStyle}>
            New submission for you
          </Heading>
          <Text style={bodyText}>
            <strong>{props.outgoingName}</strong> handed off{" "}
            <strong>{props.sellerName}</strong> ({props.propertySummary}) to you.
          </Text>
          <Text style={bodyText}>
            Reason: <em>{REASON_LABELS[props.reason] ?? props.reason}</em>.
            {props.note ? (
              <>
                <br />
                Note: {props.note}
              </>
            ) : null}
          </Text>
          <Text style={bodyText}>
            <Link href={props.submissionUrl} style={linkStyle}>
              Open in the team portal →
            </Link>
          </Text>
          <Text style={smallText}>
            Your SLA clock starts now. The seller hasn&apos;t been notified
            unless the outgoing team member opted to send a re-introduction.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f8fafc",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
};
const containerStyle = {
  maxWidth: "560px",
  margin: "0 auto",
  padding: "32px 24px",
  backgroundColor: "#ffffff",
};
const headingStyle = {
  fontSize: "20px",
  color: "#0f172a",
  marginBottom: "12px",
};
const bodyText = {
  fontSize: "15px",
  color: "#1e293b",
  lineHeight: "22px",
  marginBottom: "12px",
};
const smallText = {
  fontSize: "13px",
  color: "#475569",
  marginTop: "16px",
  lineHeight: "18px",
};
const linkStyle = {
  color: "#0d9488",
  textDecoration: "underline",
};
