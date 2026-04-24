import type { Metadata } from "next";

import { PortalLoading } from "@/components/portal/portal-app";
import {
  FallbackMessage,
  PmPreview,
  SubmissionRef,
} from "@/components/portal/setup";
import {
  CONTACT_WINDOW_HOURS,
  getAssignmentByReferralCode,
} from "@/lib/pm-service";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Setting up your portal",
  description: "Preparing your sellfree portal.",
  path: "/portal/setup",
  noindex: true,
});

interface SetupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalSetupPage({
  searchParams,
}: SetupPageProps) {
  const params = await searchParams;
  const ref = typeof params.ref === "string" ? params.ref : null;

  const assignment = ref ? await getAssignmentByReferralCode(ref) : null;

  return (
    <div style={setupLayout}>
      <div style={introWrap}>
        {assignment?.pmPreview ? (
          <PmPreview
            pm={assignment.pmPreview}
            contactWindowHours={CONTACT_WINDOW_HOURS}
          />
        ) : (
          <FallbackMessage contactWindowHours={CONTACT_WINDOW_HOURS} />
        )}
        {assignment?.submission?.referralCode ? (
          <SubmissionRef referralCode={assignment.submission.referralCode} />
        ) : null}
      </div>
      <PortalLoading />
    </div>
  );
}

const setupLayout: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const introWrap: React.CSSProperties = {
  maxWidth: 640,
  margin: "0 auto",
  padding: "24px 24px 0",
  width: "100%",
};
