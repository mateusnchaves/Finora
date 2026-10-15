import { getCurrentUser } from "@/lib/auth";
import { ServiceWorker } from "./service-worker";

/** The service worker for signed-in pages, told whose data it may keep offline. */
export async function SignedInServiceWorker() {
  const user = await getCurrentUser();
  return <ServiceWorker userId={user.id} />;
}
