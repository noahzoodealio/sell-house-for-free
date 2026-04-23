import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

import { redact } from "@/lib/ai/redact";
import { AI_SESSION_COOKIE, loadSession } from "@/lib/ai/session";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import {
  AI_DOCS_UPLOAD_LIMITS,
  UploadValidationError,
  mintSignedUrl,
  uploadToAiDocs,
} from "@/lib/supabase/storage";

export const runtime = "nodejs";
export const maxDuration = 30;

const PREVIEW_TTL_SECONDS = 300;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const jar = await cookies();
  const cookie = jar.get(AI_SESSION_COOKIE);
  if (!cookie?.value) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  const session = await loadSession(cookie.value);
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_request", details: "multipart body required" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json(
      { error: "invalid_request", details: "file field missing" },
      { status: 400 },
    );
  }

  const fileLike = file as Blob & { name?: string; type?: string };
  const original =
    typeof fileLike.name === "string" && fileLike.name.length > 0
      ? fileLike.name
      : "upload.bin";
  const mime = fileLike.type || "application/octet-stream";
  const bytes = Buffer.from(await fileLike.arrayBuffer());

  try {
    const { storagePath } = await uploadToAiDocs(session.id, {
      bytes,
      mime,
      originalName: original,
    });

    const supabase = getSupabaseAdmin();
    const { data: artifact, error } = await supabase
      .from("ai_artifacts")
      .insert({
        session_id: session.id,
        kind: "doc_summary",
        payload_json: {
          stage: "uploaded",
          storagePath,
          originalName: original,
          mime,
          sizeBytes: bytes.byteLength,
        },
      })
      .select("id")
      .single();

    if (error || !artifact) {
      throw new Error(`artifact insert failed: ${error?.message ?? "unknown"}`);
    }

    const previewUrl = await mintSignedUrl(storagePath, PREVIEW_TTL_SECONDS);

    console.log(
      redact(
        JSON.stringify({
          level: "info",
          kind: "chat.upload.ok",
          sessionId: session.id,
          documentId: (artifact as { id: string }).id,
          mime,
          sizeBytes: bytes.byteLength,
          originalName: original,
        }),
      ),
    );

    return NextResponse.json(
      {
        documentId: (artifact as { id: string }).id,
        previewUrl,
        originalName: original,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UploadValidationError) {
      const status = err.code === "file_too_large" ? 413 : 400;
      return NextResponse.json(
        {
          error: err.code,
          maxBytes:
            err.code === "file_too_large"
              ? AI_DOCS_UPLOAD_LIMITS.maxBytes
              : undefined,
        },
        { status },
      );
    }
    console.warn(
      redact(
        JSON.stringify({
          level: "warn",
          kind: "chat.upload.error",
          sessionId: session.id,
          message: err instanceof Error ? err.message : String(err),
        }),
      ),
    );
    return NextResponse.json(
      { error: "upload_failed" },
      { status: 500 },
    );
  }
}
