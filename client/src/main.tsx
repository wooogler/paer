import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000, // Consider data fresh for 1 second (reduce unnecessary refetches)
      gcTime: 1000 * 60 * 5, // Keep cache for 5 minutes
      refetchOnMount: true, // Refetch on component mount
      refetchOnWindowFocus: false, // Don't refetch on window focus (reduce flickering)
      refetchOnReconnect: true, // Always refetch on reconnect
      retry: 1,
    },
    mutations: {
      onSettled: (_data, _error, _variables, _context) => {
        // Automatically invalidate paper query after all mutations complete to refresh with latest data
        // This setting invalidates paper query regardless of mutation success/failure

        // Delay cache invalidation (allow time for server data to be reflected)
        setTimeout(() => {
          // Only invalidate without refetching (prevent flickering)
          queryClient.invalidateQueries({
            queryKey: ["paper"],
            refetchType: "none",
          });
        }, 300);
      },
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
