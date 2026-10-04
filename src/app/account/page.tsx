import { redirect } from "next/navigation";

/** Legacy /account URL — the account hub lives at /profile. */
export default function AccountPage() {
  redirect("/profile");
}
