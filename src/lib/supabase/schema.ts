export type OffervanaFailureReason =
  | "transient-exhausted"
  | "permanent"
  | "email-conflict"
  | "malformed-response";

export interface OffervanaIdempotencyRow {
  submission_id: string;
  customer_id: number;
  user_id: number | null;
  referral_code: string;
  created_at: string;
  property_id: number | null;
  offers_v2_payload: unknown[] | null;
  offers_v2_fetched_at: string | null;
}

export interface OffervanaSubmissionFailureRow {
  id: string;
  submission_id: string;
  reason: OffervanaFailureReason;
  detail: Record<string, unknown> | null;
  draft_json: Record<string, unknown> | null;
  dto_json: Record<string, unknown> | null;
  created_at: string;
  resolved_at: string | null;
}

export interface Database {
  public: {
    Tables: {
      offervana_idempotency: {
        Row: OffervanaIdempotencyRow;
        Insert: Omit<OffervanaIdempotencyRow, "created_at"> & {
          created_at?: string;
        };
        Update: Partial<OffervanaIdempotencyRow>;
      };
      offervana_submission_failures: {
        Row: OffervanaSubmissionFailureRow;
        Insert: Omit<OffervanaSubmissionFailureRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<OffervanaSubmissionFailureRow>;
      };
    };
  };
}
