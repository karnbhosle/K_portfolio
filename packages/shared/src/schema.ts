import { z } from "zod";

const text = z.string().trim().min(1);
const optionalText = text.nullable().default(null);
const httpsUrl = z.url().refine((url) => new URL(url).protocol === "https:", "Use an HTTPS URL.");

/** Assets are approved local public files, never unverified remote hotlinks. */
export const assetSchema = z.object({
  path: z.string()
    .regex(/^\/(?!\/)[A-Za-z0-9/_\-.]+$/, "Use a local public asset path beginning with /.")
    .refine((value) => !value.split("/").includes(".."), "Asset paths cannot traverse directories."),
  alt: text.max(500),
  width: z.number().int().positive().max(12000),
  height: z.number().int().positive().max(12000),
}).strict();

const optionalAsset = assetSchema.nullable().default(null);

const timeZone = text.refine((value) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}, "Use an IANA time zone such as Asia/Kolkata.");

export const profileSchema = z.object({
  displayName: text,
  fullName: text,
  role: text,
  educationLine: text,
  institution: text,
  location: text,
  timeZone: timeZone.default("Asia/Kolkata"),
  email: z.email(),
  emailHref: z.string().startsWith("mailto:"),
  phoneDisplay: text,
  phoneHref: z.string().regex(/^tel:\+[0-9]+$/),
  github: httpsUrl.nullable().default(null),
  availability: optionalText,
  introduction: text,
  headline: text,
  focusAreas: z.array(text).min(1),
  languages: z.array(text).min(1),
  languageProficiency: text,
  portrait: optionalAsset,
  publicResume: optionalAsset,
}).strict();

export const educationSchema = z.object({
  id: text,
  degree: text,
  institution: text,
  period: text,
  status: optionalText,
  /** Final result as Karna reports it: a percentage, a CGPA, or "Pursuing". */
  result: optionalText,
}).strict();

export const trainingSchema = z.object({
  id: text,
  title: text,
  provider: text,
  duration: text,
  mode: text,
  date: text,
  certificate: optionalAsset,
}).strict();

/** One step of a project's processing flow. Every field must be traceable to the CV. */
export const pipelineStageSchema = z.object({
  title: text,
  detail: optionalText,
  tools: z.array(text).default([]),
}).strict();

export const projectSchema = z.object({
  id: text,
  name: text,
  subtitle: text,
  repository: httpsUrl,
  summary: text,
  stack: z.array(text).min(1),
  highlights: z.array(text).length(3),
  architecture: z.object({
    nodes: z.array(text).min(2),
    database: text,
    note: text,
  }).strict(),
  pipeline: z.array(pipelineStageSchema).default([]),
  features: z.array(text).default([]),
  details: z.array(text).min(1),
  screenshot: optionalAsset,
  visual: z.enum(["air", "finance"]),
}).strict();

export const skillGroupSchema = z.object({
  category: text,
  skills: z.array(text).min(1),
}).strict();

export const achievementSchema = z.object({
  id: text,
  title: text,
  result: optionalText,
  location: optionalText,
  date: optionalText,
  designation: optionalText,
  description: optionalText,
  certificate: optionalAsset,
}).strict();

export const leadershipSchema = z.object({
  id: text,
  title: text,
  institution: text,
  location: text,
  role: text,
  description: text,
  highlights: z.array(text).min(1),
}).strict();

/** This explicit public schema deliberately has no academic grade fields. */
export const portfolioSchema = z.object({
  profile: profileSchema,
  education: z.array(educationSchema).min(1),
  training: z.array(trainingSchema),
  projects: z.array(projectSchema).min(1),
  skillGroups: z.array(skillGroupSchema).min(1),
  activities: z.object({
    achievements: z.array(achievementSchema),
    leadership: z.array(leadershipSchema),
  }).strict(),
}).strict();

export const contactFieldLimits = {
  name: { min: 2, max: 100 },
  email: { max: 254 },
  subject: { min: 3, max: 150 },
  message: { min: 10, max: 5000 },
  website: { max: 200 },
} as const;

const singleLine = z.string().trim().refine(
  (value) => !/[\r\n\u0000]/.test(value),
  "Use a single line of text.",
);

/** Strict shared validation prevents unexpected properties from entering storage. */
export const contactSchema = z.object({
  name: singleLine.min(contactFieldLimits.name.min, "Enter at least 2 characters.")
    .max(contactFieldLimits.name.max, "Use 100 characters or fewer."),
  email: z.string().trim().max(contactFieldLimits.email.max, "Use 254 characters or fewer.")
    .email("Enter an email address like name@example.com."),
  subject: singleLine.min(contactFieldLimits.subject.min, "Enter at least 3 characters.")
    .max(contactFieldLimits.subject.max, "Use 150 characters or fewer."),
  message: z.string().trim().min(contactFieldLimits.message.min, "Enter at least 10 characters.")
    .max(contactFieldLimits.message.max, "Use 5,000 characters or fewer.")
    .refine((value) => !value.includes("\u0000"), "Remove the unsupported character from your message."),
  website: z.string().trim().max(contactFieldLimits.website.max).optional().default(""),
}).strict();

/**
 * Optional `Idempotency-Key` request header for POST /api/contact. Retrying with the
 * same key returns the original receipt instead of saving a duplicate message.
 */
export const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/, "Use 16–128 letters, digits, - or _.");

export const notificationStatuses = ["pending", "accepted", "failed", "not_configured"] as const;
export const notificationStatusSchema = z.enum(notificationStatuses);

/** Every JSON body POST /api/contact can return. Clients parse responses with this. */
export const contactResponseSchema = z.discriminatedUnion("received", [
  z.object({
    received: z.literal(true),
    notification: notificationStatusSchema,
    message: z.string(),
    replayed: z.boolean().optional(),
  }),
  z.object({
    received: z.literal(false),
    message: z.string(),
    errors: z.record(z.string(), z.array(z.string())).optional(),
  }),
]);

export type Asset = z.infer<typeof assetSchema>;
export type Portfolio = z.infer<typeof portfolioSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type Project = z.infer<typeof projectSchema>;
export type PipelineStage = z.infer<typeof pipelineStageSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type ContactFields = z.input<typeof contactSchema>;
export type NotificationStatus = z.infer<typeof notificationStatusSchema>;
export type ContactResponse = z.infer<typeof contactResponseSchema>;
