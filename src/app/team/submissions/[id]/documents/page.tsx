import { notFound, redirect } from "next/navigation";
import Link from "next/link";

import { DocumentBucketSection } from "@/components/team/documents/DocumentRow";
import { DocumentUploader } from "@/components/team/documents/DocumentUploader";
import { createServerAuthClient } from "@/lib/supabase/server-auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { findTeamMemberByAuthUserId } from "@/lib/team/auth";
import {
  listDocumentsForSubmission,
  type DocumentBucket,
} from "@/lib/team/documents";

export const dynamic = "force-dynamic";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: submissionRowId } = await params;

  const supabase = await createServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(
      `/team/login?redirect=${encodeURIComponent(`/team/submissions/${submissionRowId}/documents`)}`,
    );
  }

  const member = await findTeamMemberByAuthUserId(user.id);
  if (!member || !member.active) {
    redirect("/team/login?error=inactive");
  }

  const admin = getSupabaseAdmin();
  const { data: submissionRow } = await admin
    .from("submissions")
    .select("id, submission_id, pm_user_id, address_line1, city, state")
    .eq("id", submissionRowId)
    .maybeSingle();
  if (!submissionRow) notFound();
  const submission = submissionRow as {
    id: string;
    submission_id: string;
    pm_user_id: string | null;
    address_line1: string;
    city: string;
    state: string;
  };

  const isAssignee = submission.pm_user_id === member.id;
  if (!isAssignee && !member.isAdmin) notFound();

  const docs = await listDocumentsForSubmission(submission.id);

  const sellerDocs = docs.filter((d) => d.bucket === "seller-docs");
  const sellerPhotos = docs.filter((d) => d.bucket === "seller-photos");
  const teamUploads = docs.filter((d) => d.bucket === "team-uploads");

  function canDelete(uploadedBy: string | null): boolean {
    if (member?.isAdmin) return true;
    return uploadedBy === user!.id;
  }

  const canEdit = isAssignee || member.isAdmin;

  const sections: Array<{
    bucket: DocumentBucket;
    title: string;
    docs: typeof docs;
    description: string;
    defaultDocKind: "listing-agreement" | "seller-photo" | "other";
  }> = [
    {
      bucket: "seller-docs",
      title: "Seller Docs",
      docs: sellerDocs,
      description: "Listing agreements, T-47, HOA, title commitments.",
      defaultDocKind: "listing-agreement",
    },
    {
      bucket: "seller-photos",
      title: "Seller Photos",
      docs: sellerPhotos,
      description: "Property photos uploaded by the seller.",
      defaultDocKind: "seller-photo",
    },
    {
      bucket: "team-uploads",
      title: "Team Uploads",
      docs: teamUploads,
      description: "Internal notes, draft contracts, anything team-only.",
      defaultDocKind: "other",
    },
  ];

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href={`/team/submissions/${submission.id}`}
        className="text-sm text-ink-subtle underline"
      >
        ← Back to submission
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-ink-heading">
        Documents — {submission.address_line1}, {submission.city},{" "}
        {submission.state}
      </h1>
      <p className="mt-1 text-sm text-ink-subtle">
        Reference {submission.submission_id}. Files download via short-lived
        signed URLs (10 min). Every upload, download, and delete is audited
        in <code>team_activity_events</code>.
      </p>

      {sections.map((section) => (
        <section key={section.bucket} className="mt-8">
          <h2 className="text-lg font-semibold text-ink-heading">
            {section.title}
          </h2>
          <p className="mt-1 text-sm text-ink-subtle">{section.description}</p>
          <div className="mt-3 flex flex-col gap-3">
            <DocumentUploader
              submissionRowId={submission.id}
              bucket={section.bucket}
              defaultDocKind={section.defaultDocKind}
              bucketLabel={section.title}
            />
            <DocumentBucketSection
              title={section.title}
              description={section.description}
              docs={section.docs}
              canDelete={canDelete}
              canEdit={canEdit}
            />
          </div>
        </section>
      ))}
    </main>
  );
}
