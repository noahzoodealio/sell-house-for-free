import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type StorageCall = {
  op: "upload" | "createSignedUrl" | "remove";
  args: unknown[];
};

function mockStorage(
  state: {
    calls: StorageCall[];
    uploadResult?: { error: null | { message: string } };
    signedResult?: { data: { signedUrl: string } | null; error: null | { message: string } };
  },
) {
  return {
    from(_bucket: string) {
      return {
        upload: async (path: string, bytes: unknown, opts: unknown) => {
          state.calls.push({
            op: "upload",
            args: [path, bytes, opts],
          });
          return state.uploadResult ?? { error: null };
        },
        createSignedUrl: async (path: string, ttl: number) => {
          state.calls.push({ op: "createSignedUrl", args: [path, ttl] });
          return (
            state.signedResult ?? {
              data: { signedUrl: `https://signed.test/${path}?ttl=${ttl}` },
              error: null,
            }
          );
        },
        remove: async (paths: string[]) => {
          state.calls.push({ op: "remove", args: [paths] });
          return { error: null };
        },
      };
    },
  };
}

describe("src/lib/supabase/storage — uploadToAiDocs", () => {
  const state: {
    calls: StorageCall[];
    uploadResult?: { error: null | { message: string } };
    signedResult?: { data: { signedUrl: string } | null; error: null | { message: string } };
  } = { calls: [] };

  beforeEach(() => {
    vi.resetModules();
    state.calls = [];
    state.uploadResult = undefined;
    state.signedResult = undefined;
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        storage: mockStorage(state),
      }),
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("rejects MIME types outside the allow-list", async () => {
    const { uploadToAiDocs, UploadValidationError } = await import(
      "../storage"
    );
    await expect(
      uploadToAiDocs("s1", {
        bytes: Buffer.from([1, 2, 3]),
        mime: "application/zip",
        originalName: "bad.zip",
      }),
    ).rejects.toThrow(UploadValidationError);
    expect(state.calls).toHaveLength(0);
  });

  it("rejects files over the size cap", async () => {
    const { uploadToAiDocs, UploadValidationError } = await import(
      "../storage"
    );
    const oversized = Buffer.alloc(10 * 1024 * 1024 + 1);
    await expect(
      uploadToAiDocs("s1", {
        bytes: oversized,
        mime: "application/pdf",
        originalName: "big.pdf",
      }),
    ).rejects.toThrow(UploadValidationError);
    expect(state.calls).toHaveLength(0);
  });

  it("uploads a valid PDF and returns a session-scoped storage path", async () => {
    const { uploadToAiDocs } = await import("../storage");
    const result = await uploadToAiDocs("sess-1", {
      bytes: Buffer.from("fake-pdf"),
      mime: "application/pdf",
      originalName: "offer.pdf",
    });
    expect(result.storagePath).toMatch(/^sess-1\/[0-9a-f-]{36}\.pdf$/i);
    expect(state.calls[0]).toMatchObject({ op: "upload" });
    expect(state.calls[0]!.args[2]).toMatchObject({
      contentType: "application/pdf",
      upsert: false,
    });
  });

  it("surfaces Supabase upload errors as thrown Error", async () => {
    state.uploadResult = { error: { message: "bucket full" } };
    const { uploadToAiDocs } = await import("../storage");
    await expect(
      uploadToAiDocs("sess-2", {
        bytes: Buffer.from("x"),
        mime: "image/png",
        originalName: "p.png",
      }),
    ).rejects.toThrow(/bucket full/);
  });
});

describe("src/lib/supabase/storage — mintSignedUrl / deleteFromAiDocs", () => {
  const state: {
    calls: StorageCall[];
    uploadResult?: { error: null | { message: string } };
    signedResult?: { data: { signedUrl: string } | null; error: null | { message: string } };
  } = { calls: [] };

  beforeEach(() => {
    vi.resetModules();
    state.calls = [];
    state.uploadResult = undefined;
    state.signedResult = undefined;
    vi.doMock("@/lib/supabase/server", () => ({
      getSupabaseAdmin: () => ({
        storage: mockStorage(state),
      }),
    }));
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("mints a signed URL at the requested TTL", async () => {
    const { mintSignedUrl } = await import("../storage");
    const url = await mintSignedUrl("sess-1/abc.pdf", 300);
    expect(url).toContain("sess-1/abc.pdf");
    expect(url).toContain("ttl=300");
    expect(state.calls[0]?.op).toBe("createSignedUrl");
  });

  it("defaults mintSignedUrl TTL to 3600 seconds", async () => {
    const { mintSignedUrl } = await import("../storage");
    await mintSignedUrl("sess/abc.pdf");
    expect(state.calls[0]?.args).toEqual(["sess/abc.pdf", 3600]);
  });

  it("deleteFromAiDocs calls remove with the path", async () => {
    const { deleteFromAiDocs } = await import("../storage");
    await deleteFromAiDocs("sess/x.pdf");
    expect(state.calls[0]).toMatchObject({
      op: "remove",
      args: [["sess/x.pdf"]],
    });
  });
});
