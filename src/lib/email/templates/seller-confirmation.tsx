import "server-only";

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import type { SellerConfirmationProps } from "../dynamic-data";
import { Disclaimer } from "./disclaimer";

// Placeholder copy — E6-S7 finalizes the seller confirmation wording +
// TCPA footer import (E7) + three-part AI/tech-platform disclaimer.
// This shell ships the structural surface S4 is responsible for.

export function SellerConfirmation(props: SellerConfirmationProps) {
  const pmInitials = props.pmFirstName.slice(0, 1).toUpperCase();
  return (
    <Html lang="en">
      <Head />
      <Preview>
        {`We received your submission — ${props.pmFirstName} will reach out within ${props.contactWindowHours} hours.`}
      </Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading as="h1" style={headingStyle}>
            Hi {props.sellerFirstName}, we&apos;ve received your home.
          </Heading>
          <Text style={bodyText}>
            Thanks for sharing the details. We&apos;ve assigned{" "}
            <strong>{props.pmFirstName}</strong> as your Project Manager —
            they&apos;ll reach out within{" "}
            <strong>{props.contactWindowHours} hours</strong> to walk you
            through every path available for your home, from cash offers to
            a traditional listing.
          </Text>
          <Text style={bodyText}>
            You don&apos;t need to do anything yet. If a question comes up
            before {props.pmFirstName} reaches out, just reply to this email
            — we read every response.
          </Text>

          <Section style={pmSection}>
            {props.pmPhotoUrl ? (
              <Img
                src={props.pmPhotoUrl}
                width="72"
                height="72"
                alt={`Photo of ${props.pmFirstName}`}
                style={pmPhoto}
              />
            ) : (
              <Text style={pmInitial}>{pmInitials}</Text>
            )}
            <Text style={pmName}>{props.pmFirstName}</Text>
            <Text style={pmRole}>Your Project Manager</Text>
          </Section>

          <Hr style={hrStyle} />

          <Text style={smallText}>
            Submission reference: <code>{props.referralCode}</code>
          </Text>

          <Disclaimer />

          <Text style={footerText}>
            You&apos;re receiving this because you submitted your home at
            sellyourhousefree.com.{" "}
            <Link href={props.unsubscribeUrl} style={linkStyle}>
              Unsubscribe
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f6f7fb",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
};

const containerStyle = {
  margin: "0 auto",
  padding: "32px 24px",
  maxWidth: "560px",
  backgroundColor: "#ffffff",
};

const headingStyle = {
  fontSize: "24px",
  color: "#111827",
};

const bodyText = {
  fontSize: "16px",
  lineHeight: "24px",
  color: "#111827",
};

const pmSection = {
  margin: "24px 0",
  padding: "16px",
  backgroundColor: "#f1f5f9",
  borderRadius: "8px",
  textAlign: "center" as const,
};

const pmPhoto = {
  borderRadius: "50%",
  margin: "0 auto",
};

const pmInitial = {
  fontSize: "32px",
  fontWeight: "600",
  width: "72px",
  height: "72px",
  lineHeight: "72px",
  margin: "0 auto",
  backgroundColor: "#cbd5e1",
  borderRadius: "50%",
  textAlign: "center" as const,
  color: "#1e293b",
};

const pmName = {
  fontSize: "18px",
  fontWeight: "600",
  margin: "12px 0 4px",
  color: "#111827",
};

const pmRole = {
  fontSize: "14px",
  color: "#475569",
  margin: "0",
};

const hrStyle = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const smallText = {
  fontSize: "14px",
  color: "#475569",
};

const footerText = {
  fontSize: "11px",
  color: "#94a3b8",
  marginTop: "16px",
  lineHeight: "16px",
};

const linkStyle = {
  color: "#475569",
  textDecoration: "underline",
};
