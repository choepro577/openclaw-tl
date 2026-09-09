import { z } from "zod";

const uniqueNormalized = (values: readonly string[]) =>
  new Set(values.map((value) => value.toLocaleLowerCase())).size === values.length;

const profileSchema = z
  .object({
    status: z.enum(["draft", "active", "disabled"]),
    aliases: z.array(z.string().trim().min(1).max(64)).max(20).refine(uniqueNormalized),
    handlingMode: z.enum(["auto_when_certain", "confirm_before_handoff", "explicit_only"]),
    useWhen: z.array(z.string().trim().min(5).max(240)).max(20).refine(uniqueNormalized),
    avoidWhen: z.array(z.string().trim().min(5).max(240)).max(20),
    requiredInputs: z
      .array(
        z
          .object({
            id: z
              .string()
              .regex(/^[a-z][a-z0-9_-]{0,63}$/)
              .optional(),
            label: z.string().trim().min(1).max(80),
            question: z.string().trim().min(5).max(240),
          })
          .strict(),
      )
      .max(20),
  })
  .strict();

export const EnterpriseDelegationSettingsPatchSchema = z
  .object({
    baseRevision: z.number().int().nonnegative(),
    rollout: z.enum(["off", "shadow", "on"]),
    routerModel: z.string().trim().max(256),
    autoThreshold: z.number().min(0).max(1),
    clarifyThreshold: z.number().min(0).max(1),
    minimumMargin: z.number().min(0).max(1),
    maxDelegatesPerTurn: z.number().int().min(1).max(3),
    eventRetentionDays: z.number().int().min(1).max(3_650),
  })
  .strict();

export const EnterpriseDelegationOverridePatchSchema = z
  .object({
    agentResourceKey: z.string().trim().min(1).max(256).startsWith("agent:shared:"),
    mode: z.enum(["inherit", "confirm_before_handoff", "explicit_only", "disabled"]),
    baseRevision: z.number().int().nonnegative(),
    baseAccountPolicyRevision: z.number().int().nonnegative(),
  })
  .strict();

export const EnterpriseDelegationActivationSchema = z
  .object({
    previewToken: z.string().trim().min(16).max(128),
    exclusions: z
      .array(
        z
          .object({
            accountId: z.string().trim().min(1).max(128),
            agentResourceKey: z.string().trim().min(1).max(256).startsWith("agent:shared:"),
          })
          .strict(),
      )
      .max(2_000)
      .default([]),
  })
  .strict();

export const EnterpriseDelegationProfilePatchSchema = z
  .object({
    description: z.string().trim().max(500),
    profile: profileSchema,
    baseHash: z.string().trim().min(1).max(256),
  })
  .strict();

export const EnterpriseDelegationSimulationSchema = z
  .object({
    accountId: z.string().trim().min(1).max(128),
    prompt: z.string().trim().min(1).max(8_000),
  })
  .strict();

export const EnterpriseDelegationEmptyBodySchema = z.object({}).strict();

export function parseEnterpriseDelegationApiBody<T extends z.ZodType>(
  schema: T,
  body: unknown,
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    const path = result.error.issues[0]?.path.join(".") || "body";
    throw new Error(`FIELD_INVALID:${path}`);
  }
  return result.data;
}
