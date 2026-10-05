import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { apiSuccess, handleApiError } from "@/lib/api-response";
import { validateRequestBody } from "@/lib/validation";
import { logAdminAudit } from "@/lib/audit";
import { landingConfigSchema } from "@/lib/landing/config";
import { discardLandingDraft, getLandingState, publishLanding, saveLandingDraft } from "@/lib/landing/store";

/** GET /api/developer/landing — current draft + published homepage layout. */
export async function GET(req: Request) {
  try {
    await requireRole(req, "DEVELOPER");
    return apiSuccess(await getLandingState());
  } catch (err) {
    return handleApiError(err);
  }
}

/** PUT /api/developer/landing — save the draft (visitors don't see it until published). */
export async function PUT(req: Request) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    const { config } = await validateRequestBody(req, z.object({ config: landingConfigSchema }));
    return apiSuccess(await saveLandingDraft(config, user), "Draft saved");
  } catch (err) {
    return handleApiError(err);
  }
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("publish"), config: landingConfigSchema }),
  z.object({ action: z.literal("discard") }),
]);

/** POST /api/developer/landing — { action: "publish", config } goes live; { action: "discard" } reverts the draft to what's live. */
export async function POST(req: Request) {
  try {
    const user = await requireRole(req, "DEVELOPER");
    const body = await validateRequestBody(req, actionSchema);

    if (body.action === "publish") {
      const state = await publishLanding(body.config, user);
      await logAdminAudit({
        action: "LANDING_PAGE_PUBLISHED",
        actor: user,
        resource: { type: "SITE_CONTENT", identifier: "landing" },
        details: { sections: body.config.sections.map((s) => `${s.type}${s.enabled ? "" : " (hidden)"}`) },
        req,
      });
      return apiSuccess(state, "Homepage published");
    }

    const state = await discardLandingDraft(user);
    await logAdminAudit({
      action: "LANDING_PAGE_DRAFT_DISCARDED",
      actor: user,
      resource: { type: "SITE_CONTENT", identifier: "landing" },
      req,
    });
    return apiSuccess(state, "Draft discarded");
  } catch (err) {
    return handleApiError(err);
  }
}
