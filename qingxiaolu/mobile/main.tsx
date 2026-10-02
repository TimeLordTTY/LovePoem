import React from "react";
import ReactDOM from "react-dom/client";
import WritingStartup from "./WritingStartup";
import "../app/globals.css";
import "./mobile.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WritingStartup />
  </React.StrictMode>,
);
