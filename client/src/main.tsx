import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 0, // 항상 데이터를 stale 상태로 간주
      gcTime: 1000 * 60 * 5, // 캐시는 5분 유지
      refetchOnMount: true, // 컴포넌트 마운트 시 항상 refetch
      refetchOnWindowFocus: true, // 윈도우 포커스 시 항상 refetch
      refetchOnReconnect: true, // 재연결 시 항상 refetch
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
