import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import type { AuthTokenPayload } from "@/lib/auth";
import { DEFAULT_LANDING_CONFIG, LandingConfig, normalizeLandingConfig } from "./config";

const LANDING_KEY = "landing";

export interface LandingState {
  draft: LandingConfig;
  published: LandingConfig;
  hasUnpublishedChanges: boolean;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  publishedAt: string | null;
  publishedBy: string | null;
}

const editor = (u: AuthTokenPayload) => ({ userId: String(u.userId), email: u.email, name: u.name });
const iso = (d: unknown) => (d ? new Date(d as string).toISOString() : null);

interface StoredDoc {
  draft?: unknown;
  published?: unknown;
  draftUpdatedAt?: Date | string;
  draftUpdatedBy?: { name?: string };
  publishedAt?: Date | string;
  publishedBy?: { name?: string };
}

function toState(doc: StoredDoc | null): LandingState {
  const published = normalizeLandingConfig(doc?.published ?? DEFAULT_LANDING_CONFIG);
  const draft = doc?.draft ? normalizeLandingConfig(doc.draft) : published;
  return {
    draft,
    published,
    hasUnpublishedChanges: JSON.stringify(draft) !== JSON.stringify(published),
    draftUpdatedAt: iso(doc?.draftUpdatedAt),
    draftUpdatedBy: doc?.draftUpdatedBy?.name ?? null,
    publishedAt: iso(doc?.publishedAt),
    publishedBy: doc?.publishedBy?.name ?? null,
  };
}

async function findDoc(): Promise<StoredDoc | null> {
  try {
    const { data } = await supabase
      .from("site_contents")
      .select("content")
      .eq("key", LANDING_KEY)
      .maybeSingle();

    return (data?.content as StoredDoc) || null;
  } catch (err) {
    logger.error("Failed to query site_contents in Supabase:", undefined, err);
    return null;
  }
}

/** What visitors see. Never throws — falls back to the built-in layout. */
export async function getPublishedLanding(): Promise<LandingConfig> {
  try {
    const doc = await findDoc();
    return normalizeLandingConfig(doc?.published ?? DEFAULT_LANDING_CONFIG);
  } catch (err) {
    logger.error("Failed to load landing page config; using defaults", undefined, err);
    return DEFAULT_LANDING_CONFIG;
  }
}

export async function getLandingState(): Promise<LandingState> {
  return toState(await findDoc());
}

async function upsert(fields: Record<string, unknown>) {
  const existing = await findDoc();
  const merged = {
    published: DEFAULT_LANDING_CONFIG,
    ...(existing || {}),
    ...fields,
  };

  try {
    const { data: row } = await supabase
      .from("site_contents")
      .select("id")
      .eq("key", LANDING_KEY)
      .maybeSingle();

    if (row?.id) {
      await supabase
        .from("site_contents")
        .update({ content: merged })
        .eq("id", row.id);
    } else {
      await supabase
        .from("site_contents")
        .insert({ key: LANDING_KEY, content: merged });
    }
  } catch (err) {
    logger.error("Failed to upsert landing in Supabase:", undefined, err);
  }

  return getLandingState();
}

export function saveLandingDraft(config: LandingConfig, user: AuthTokenPayload) {
  return upsert({ draft: config, draftUpdatedAt: new Date().toISOString(), draftUpdatedBy: editor(user) });
}

export function publishLanding(config: LandingConfig, user: AuthTokenPayload) {
  const now = new Date().toISOString();
  return upsert({
    draft: config,
    published: config,
    draftUpdatedAt: now,
    draftUpdatedBy: editor(user),
    publishedAt: now,
    publishedBy: editor(user),
  });
}

export async function discardLandingDraft(user: AuthTokenPayload) {
  const { published } = await getLandingState();
  return upsert({ draft: published, draftUpdatedAt: new Date().toISOString(), draftUpdatedBy: editor(user) });
}
