import React from "react";
import ReactDOM from "react-dom/client";
import RealMobileApp from "./RealMobileApp";
import "../app/globals.css";
import "./mobile.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RealMobileApp />
  </React.StrictMode>,
);
