import { createFileRoute } from "@tanstack/react-router";
import { Workstation } from "@/components/eeg/workstation";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <Workstation />;
}
