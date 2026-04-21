import {StrictMode} from "react";
import {createRoot} from "react-dom/client";
import {QueryClient, QueryClientProvider} from "@tanstack/react-query";
import {ViteRouterApp} from "./vite-router-app";
import "@/app/globals.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ViteRouterApp />
    </QueryClientProvider>
  </StrictMode>,
);
