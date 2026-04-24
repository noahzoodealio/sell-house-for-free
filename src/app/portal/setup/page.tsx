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
import { createServerAuthClient } from "@/lib/supabase/server-auth";

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
  const sid = typeof params.sid === "string" ? params.sid : null;

  // When `sid` is provided, verify the seller actually owns the submission
  // before rendering the polling island. RLS filters the row out when the
  // session doesn't match; a missing row surfaces as the neutral fallback
  // pane instead of leaking whether the submission exists elsewhere.
  if (sid) {
    try {
      const supabase = await createServerAuthClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return renderFallback();
      }
      const { data: row } = await supabase
        .from("submissions")
        .select("id")
        .eq("submission_id", sid)
        .maybeSingle();
      if (!row) {
        return renderFallback();
      }
    } catch {
      return renderFallback();
    }
  }

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

function renderFallback() {
  return (
    <div style={setupLayout}>
      <div style={introWrap}>
        <FallbackMessage contactWindowHours={CONTACT_WINDOW_HOURS} />
      </div>
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
