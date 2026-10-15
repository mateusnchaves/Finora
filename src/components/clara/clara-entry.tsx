import { aiConfigured } from "@/lib/ai/client";
import { getCurrentUser } from "@/lib/auth";
import { ClaraChat } from "./clara-chat";

/** Clara's button, on every signed-in page when the AI is configured. */
export async function ClaraEntry() {
  if (!aiConfigured()) return null;
  const user = await getCurrentUser();
  return <ClaraChat isDemo={user.isDemo} />;
}
