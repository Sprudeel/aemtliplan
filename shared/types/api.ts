// Shapes of API responses as the browser receives them (dates are ISO strings).
// Keep in sync with the dto functions in server/utils/plan-data.ts and rotation-service.ts.

export type PlanRole = "viewer" | "admin";
export type IdlePolicy = "slots" | "fair";
export type Visibility = "private" | "public";
export type RotationTrigger = "manual" | "schedule" | "undo";

export interface MemberDto {
  id: number;
  name: string;
  hasLogin: boolean;
  invited: boolean;
}

export interface GroupDto {
  id: number;
  name: string;
  color: string;
  inRotation: boolean;
  idleSince: string | null;
  members: MemberDto[];
}

export interface JobDto {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  position: number;
}

export interface SettingsDto {
  timezone: string;
  rotationEnabled: boolean;
  rotationTime: string;
  idlePolicy: IdlePolicy;
  visibility: Visibility;
  publicSlug: string;
  showMemberNames: boolean;
  memberLogin: boolean;
  backgroundUrl: string | null;
}

export interface PlanDto {
  id: string;
  name: string;
  slug: string;
  myRole: PlanRole;
  nextRotationAt: string | null;
  settings: SettingsDto;
}

export interface AssignmentDto {
  jobId: number;
  group: GroupDto | null;
}

export interface PreviewEntryDto {
  jobId: number;
  current: GroupDto | null;
  next: GroupDto | null;
}

export interface SlotDto {
  jobId: number;
  groupId: number | null;
}

export interface RotationDto {
  id: number;
  at: string;
  trigger: RotationTrigger;
  byUserId: string | null;
  before: SlotDto[];
  after: SlotDto[];
  undoneAt: string | null;
}

export interface MeDto {
  role: PlanRole;
  member: { id: number; name: string } | null;
  group: GroupDto | null;
  jobs: JobDto[];
}

export interface PublicItemDto {
  key: string;
  job: { name: string; icon: string | null; description: string | null };
  group: { name: string; color: string; members?: string[] } | null;
}

export interface PublicPlanDto {
  name: string;
  design: import("../wall-design").WallDesign;
  backgroundUrl: string | null;
  updatedAt: string;
  nextRotationAt: string | null;
  items: PublicItemDto[];
}

export interface MidataCampDto {
  id: string;
  name: string;
  startsAt: string | null;
  endsAt: string | null;
}

export interface AppConfigDto {
  midata: boolean;
}

/** better-auth organization (= plan) as returned by /api/auth/organization/list. */
export interface PlanSummary {
  id: string;
  name: string;
  slug: string;
}

/** better-auth session as returned by /api/auth/get-session. */
export interface SessionDto {
  user: { id: string; name: string; email: string; emailVerified: boolean; image?: string | null };
  session: { id: string; expiresAt: string };
}
