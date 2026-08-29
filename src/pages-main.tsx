import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Workstation } from "@/components/eeg/workstation";
import "@/styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Auris could not find its application root.");
}

createRoot(root).render(
  <StrictMode>
    <Workstation />
  </StrictMode>,
);
