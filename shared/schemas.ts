// Request schemas shared by the API and (later) the Nuxt UI forms.
import { z } from "zod";

export const IDLE_POLICIES = ["slots", "fair"] as const;
export const VISIBILITIES = ["private", "public"] as const;

export function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const name = z.string().trim().min(1, "Name required").max(80);
const memberName = z.string().trim().min(1).max(80);
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be #RRGGBB");
const nonEmpty = <T extends object>(value: T) => Object.keys(value).length > 0;

// Groups
export const GroupCreate = z.object({
  name,
  color: hexColor.default("#000000"),
  members: z.array(memberName).min(1).max(100),
  inRotation: z.boolean().default(true),
});
export const GroupUpdate = z
  .object({
    name,
    color: hexColor,
    members: z.array(memberName).min(1).max(100),
    inRotation: z.boolean(),
  })
  .partial()
  .refine(nonEmpty, "Nothing to update");

// Ämtli (jobs)
export const JobCreate = z.object({
  name,
  icon: z.string().trim().max(64).optional(),
  description: z.string().trim().max(500).optional(),
});
export const JobUpdate = z
  .object({
    name,
    icon: z.string().trim().max(64).nullable(),
    description: z.string().trim().max(500).nullable(),
  })
  .partial()
  .refine(nonEmpty, "Nothing to update");
export const JobOrder = z.object({
  jobIds: z.array(z.number().int().positive()).min(1),
});

// Assignments
export const AssignmentPut = z.object({ groupId: z.number().int().positive() });

// Rotations
export const RotationCreate = z.object({
  steps: z.number().int().min(1).max(100).default(1),
});
export const RotationPreviewQuery = z.object({
  steps: z.coerce.number().int().min(1).max(100).default(1),
});
export const RotationListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// Plan settings
export const SettingsPatch = z
  .object({
    timezone: z.string().refine(isValidTimeZone, "Unknown time zone"),
    rotationEnabled: z.boolean(),
    rotationTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:mm"),
    idlePolicy: z.enum(IDLE_POLICIES),
    visibility: z.enum(VISIBILITIES),
    showMemberNames: z.boolean(),
    memberLogin: z.boolean(),
  })
  .partial()
  .refine(nonEmpty, "Nothing to update");

// Member login
export const MemberInvite = z.object({ email: z.email() });
