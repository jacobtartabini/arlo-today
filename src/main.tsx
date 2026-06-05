import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { initStoredAuth } from "./lib/auth";
import "./index.css";

const root = document.getElementById("root") as HTMLElement;

void initStoredAuth().finally(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
