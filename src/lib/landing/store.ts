import { connectToDatabase } from "@/lib/db";
import { logger } from "@/lib/logger";
import { SiteContent } from "@/models/SiteContent";
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

async function findDoc() {
  await connectToDatabase();
  return SiteContent.findOne({ key: LANDING_KEY });
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
  return toState((await findDoc()) as StoredDoc | null);
}

async function upsert(fields: Record<string, unknown>) {
  const doc = await findDoc();
  if (!doc) {
    await SiteContent.create({ key: LANDING_KEY, published: DEFAULT_LANDING_CONFIG, ...fields });
  } else {
    // Works for both Mongoose documents and the in-memory dev fallback
    Object.assign(doc, fields);
    // Mixed paths aren't change-tracked by Mongoose
    doc.markModified?.("draft");
    doc.markModified?.("published");
    await doc.save();
  }
  return getLandingState();
}

export function saveLandingDraft(config: LandingConfig, user: AuthTokenPayload) {
  return upsert({ draft: config, draftUpdatedAt: new Date(), draftUpdatedBy: editor(user) });
}

export function publishLanding(config: LandingConfig, user: AuthTokenPayload) {
  const now = new Date();
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
  return upsert({ draft: published, draftUpdatedAt: new Date(), draftUpdatedBy: editor(user) });
}
