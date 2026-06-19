import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import ResearchUI from "./ResearchUI.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ResearchUI />
  </StrictMode>
);
