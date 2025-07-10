/// <reference types="vite/client" />

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

// Import Inter font weights
import '@fontsource/inter/400.css'; // Regular
import '@fontsource/inter/500.css'; // Medium  
import '@fontsource/inter/600.css'; // SemiBold
import '@fontsource/inter/700.css'; // Bold

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ConvexProvider client={convex}>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </ConvexProvider>
  </React.StrictMode>
);
