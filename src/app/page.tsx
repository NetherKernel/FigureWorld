import { connection } from "next/server";
import { LandingPage } from "@/components/home/LandingPage";
import { getPublishedLanding } from "@/lib/landing/store";

/**
 * Homepage. The layout (sections, order, content) is admin-editable in
 * /developer/customize; this renders whatever is currently published.
 */
export default async function HomePage() {
  await connection(); // published layout can change at any time — render per request
  const config = await getPublishedLanding();
  // Hidden sections never leave the server (they may hold unannounced promos)
  return <LandingPage config={{ ...config, sections: config.sections.filter((s) => s.enabled) }} />;
}
