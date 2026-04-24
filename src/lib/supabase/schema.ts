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

// E6-S1 (ADO 7823): PM service + seller data model -----------------------

export type TeamMemberRoleBadge = "tc" | "pm" | "agent";

export interface TeamMemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  photo_url: string | null;
  bio: string | null;
  active: boolean;
  role: TeamMemberRoleBadge[];
  coverage_regions: string[];
  last_assigned_at: string | null;
  total_assignments: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileRow {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  tcpa_version: string | null;
  tcpa_accepted_at: string | null;
  terms_version: string | null;
  terms_accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type SubmissionStatus =
  | "new"
  | "assigned"
  | "active"
  | "closed_won"
  | "closed_lost";

export type SubmissionOfferPath = "cash" | "cash_plus" | "snml" | "list";

export type AssignmentEventKind = "assigned" | "reassigned" | "unassigned";

export interface SubmissionRow {
  id: string;
  submission_id: string;
  seller_id: string;
  referral_code: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  zip: string;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  seller_paths: string[];
  timeline: string | null;
  pillar_hint: string | null;
  status: SubmissionStatus;
  pm_user_id: string | null;
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubmissionOfferRow {
  id: string;
  submission_id: string;
  path: SubmissionOfferPath;
  low_cents: number | null;
  high_cents: number | null;
  raw_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface AssignmentEventRow {
  id: string;
  submission_id: string;
  team_member_id: string | null;
  kind: AssignmentEventKind;
  reason: string | null;
  created_at: string;
}

export type NotificationRecipientType = "seller" | "team_member";

export type NotificationTemplateKey =
  | "seller_confirmation"
  | "team_member_notification";

export type NotificationStatus = "retry_pending" | "sent" | "failed";

export interface NotificationLogRow {
  id: string;
  submission_id: string;
  recipient_type: NotificationRecipientType;
  recipient_email: string;
  template_key: NotificationTemplateKey;
  attempt: number;
  status: NotificationStatus;
  provider: string;
  provider_message_id: string | null;
  error_reason: string | null;
  created_at: string;
}

// assign_next_pm RPC return shape ---------------------------------------

export interface AssignNextPmResult {
  assignment_kind: "fresh" | "existing";
  team_member_id: string;
  pm_first_name: string;
  pm_photo_url: string | null;
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
      team_members: {
        Row: TeamMemberRow;
        Insert: Omit<
          TeamMemberRow,
          "id" | "created_at" | "updated_at" | "total_assignments"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
          total_assignments?: number;
        };
        Update: Partial<TeamMemberRow>;
      };
      profiles: {
        Row: ProfileRow;
        Insert: Omit<ProfileRow, "created_at" | "updated_at"> & {
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<ProfileRow>;
      };
      submissions: {
        Row: SubmissionRow;
        Insert: Omit<
          SubmissionRow,
          "id" | "status" | "created_at" | "updated_at"
        > & {
          id?: string;
          status?: SubmissionStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<SubmissionRow>;
      };
      submission_offers: {
        Row: SubmissionOfferRow;
        Insert: Omit<SubmissionOfferRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<SubmissionOfferRow>;
      };
      assignment_events: {
        Row: AssignmentEventRow;
        Insert: Omit<AssignmentEventRow, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<AssignmentEventRow>;
      };
      notification_log: {
        Row: NotificationLogRow;
        Insert: Omit<
          NotificationLogRow,
          "id" | "created_at" | "attempt" | "provider"
        > & {
          id?: string;
          created_at?: string;
          attempt?: number;
          provider?: string;
        };
        Update: Partial<NotificationLogRow>;
      };
    };
    Functions: {
      assign_next_pm: {
        Args: { p_submission_id: string };
        Returns: AssignNextPmResult[];
      };
    };
  };
}
