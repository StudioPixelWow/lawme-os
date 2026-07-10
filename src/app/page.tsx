import { redirect } from "next/navigation";

/** The OS opens on the morning brief. */
export default function Home() {
  redirect("/today");
}
