import { brandProductCopy } from "../branding/display-brand.ts";
import { enterpriseAdminConfigCopy } from "./enterprise-admin-config-copy.ts";
import { enterpriseAdminResourceCopy } from "./enterprise-admin-resource-copy.ts";
import { i18n } from "./index.ts";

// Keep this facade stable for Admin pages while the bilingual tables stay below the max-lines limit.
const copy = {
  ...enterpriseAdminConfigCopy,
  ...enterpriseAdminResourceCopy,
} as const;

export type EnterpriseAdminCopyKey = keyof typeof copy;

export function enterpriseAdminCopy(
  key: EnterpriseAdminCopyKey,
  params?: Record<string, string>,
): string {
  const value = copy[key][i18n.getLocale() === "vi" ? 0 : 1];
  const brandedValue = brandProductCopy(value);
  return params
    ? brandedValue.replace(/\{(\w+)\}/gu, (_, name: string) => params[name] ?? `{${name}}`)
    : brandedValue;
}

export const ea = enterpriseAdminCopy;
