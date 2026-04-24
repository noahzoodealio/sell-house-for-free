import "server-only";

import { Text } from "@react-email/components";

// Shared three-part disclaimer. Applied on marketing-adjacent email
// surfaces (seller confirmation). NOT applied to transactional
// internal-facing surfaces (team-member notification). Policy anchor:
// docs/ai-agent-policy.md.
//
// Part 1: technology platform, not a brokerage
// Part 2: not financial or legal advice; consult licensed professional
// Part 3: factual rates + AZ compliance hook that E7 finalizes

export function Disclaimer() {
  return (
    <>
      <Text style={partStyle}>
        Sell Your House Free is a technology platform, not a real estate
        brokerage. We connect homeowners with knowledgeable partners who can
        explain your options.
      </Text>
      <Text style={partStyle}>
        This message is informational. It is not financial, legal, or tax
        advice — for those, consult a licensed professional.
      </Text>
      {/* TODO(E7): Replace with canonical TCPA / AZ-compliance footer. */}
      <Text style={partStyle}>
        Licensed in Arizona. Questions about how we operate in your state?
        Reply to this email and we&apos;ll get back to you.
      </Text>
    </>
  );
}

const partStyle = {
  fontSize: "12px",
  color: "#64748b",
  marginTop: "10px",
  lineHeight: "18px",
};
