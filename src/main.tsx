/// <reference types="vite/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithAuth } from "convex/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProviderWithAuth client={convex}>
      <App />
    </ConvexProviderWithAuth>
  </React.StrictMode>
);
