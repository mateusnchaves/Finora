import { redirect } from "next/navigation";

// Becomes the public landing / login page in Phase 1.
export default function Home() {
  redirect("/dashboard");
}
