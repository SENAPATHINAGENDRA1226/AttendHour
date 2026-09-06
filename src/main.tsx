import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { registerSW } from "virtual:pwa-register";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./styles.css";

// Register service worker — defer update to avoid flash/reload when app opens
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Silently update on next navigation instead of reloading immediately
    updateSW(true);
  },
  onOfflineReady() {
    // App is cached and ready for offline use
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

