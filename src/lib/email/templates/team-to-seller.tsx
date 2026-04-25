import "server-only";

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";

import { Disclaimer } from "./disclaimer";

export interface TeamToSellerProps {
  sellerFirstName: string;
  teamMemberName: string;
  teamMemberEmail: string;
  subject: string;
  body: string;
  portalUrl: string;
}

// Free-form team → seller message. Body is plaintext with newlines preserved.
// Disclaimer footer follows docs/ai-agent-policy.md — even though this is from
// a human team member, the platform-wide tech-platform/not-fiduciary posture
// stands.
export function TeamToSeller(props: TeamToSellerProps) {
  const lines = props.body.split(/\r?\n/);
  return (
    <Html lang="en">
      <Head />
      <Preview>{props.subject}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={headingStyle}>
            Hi {props.sellerFirstName},
          </Heading>
          {lines.map((line, idx) =>
            line.length === 0 ? (
              <Text key={idx} style={bodySpacer}>
                &nbsp;
              </Text>
            ) : (
              <Text key={idx} style={bodyText}>
                {line}
              </Text>
            ),
          )}

          <Text style={signatureText}>
            — {props.teamMemberName}
            <br />
            <Link href={`mailto:${props.teamMemberEmail}`} style={linkStyle}>
              {props.teamMemberEmail}
            </Link>
          </Text>

          <Hr style={hrStyle} />

          <Text style={smallText}>
            Reply to this email and your message lands in your{" "}
            <Link href={props.portalUrl} style={linkStyle}>
              portal thread
            </Link>{" "}
            with our team.
          </Text>

          <Disclaimer />
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
  marginTop: "0px",
  marginBottom: "12px",
};
const bodySpacer = {
  fontSize: "15px",
  marginTop: "0px",
  marginBottom: "12px",
  lineHeight: "22px",
};
const signatureText = {
  fontSize: "14px",
  color: "#1e293b",
  marginTop: "24px",
  lineHeight: "20px",
};
const linkStyle = {
  color: "#0d9488",
  textDecoration: "underline",
};
const hrStyle = {
  borderColor: "#e2e8f0",
  marginTop: "24px",
  marginBottom: "16px",
};
const smallText = {
  fontSize: "13px",
  color: "#475569",
  marginBottom: "12px",
  lineHeight: "18px",
};
