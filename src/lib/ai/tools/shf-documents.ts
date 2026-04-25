import "server-only";

import { z } from "zod";

import { DOC_SUMMARY_DISCLAIMER } from "@/lib/ai/prompts/pdf-reviewer";
import { redactObject } from "@/lib/ai/redact";
import {
  defineTool,
  type DefineToolSessionLike,
} from "@/lib/ai/tools/_define";
import {
  resolveSubmissionForSession,
  type ShfSession,
} from "@/lib/ai/tools/shf-shared";
import { mintSignedUrl } from "@/lib/supabase/storage";

interface Session extends DefineToolSessionLike, ShfSession {
  id: string;
}

interface DocumentRow {
  id: string;
  name: string;
  storage_path: string;
  mime: string | null;
  size_bytes: number | null;
  created_at: string;
}

export function listMyDocumentsTool(session: Session) {
  const factory = defineTool({
    name: "listMyDocuments",
    description:
      "List the seller's documents (E11). Returns short-lived signed URLs (60-min TTL) for each.",
    inputSchema: z.object({}),
    handler: async (_input, ctx) => {
      const submission = await resolveSubmissionForSession(session, ctx.supabase);
      if (!submission) {
        return {
          data: [],
          reason: "no_record" as const,
          source: "supabase-documents",
          retrievedAt: null,
          disclaimer: DOC_SUMMARY_DISCLAIMER,
        };
      }

      const { data: rowsRaw } = await ctx.supabase
        .from("documents")
        .select("id, name, storage_path, mime, size_bytes, created_at")
        .eq("submission_id", submission.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      const rows = (rowsRaw ?? []) as DocumentRow[];

      const withUrls = await Promise.all(
        rows.map(async (row) => ({
          id: row.id,
          name: row.name,
          mime: row.mime,
          sizeBytes: row.size_bytes,
          createdAt: row.created_at,
          signedUrl: await mintSignedUrl(row.storage_path, 3600),
        })),
      );

      return {
        data: redactObject(withUrls),
        source: "supabase-documents",
        retrievedAt: new Date().toISOString(),
        disclaimer: DOC_SUMMARY_DISCLAIMER,
      };
    },
  });
  return factory(session);
}
