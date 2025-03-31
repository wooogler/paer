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
      staleTime: 1000, // 1초 동안 데이터를 최신으로 간주 (불필요한 리페치 감소)
      gcTime: 1000 * 60 * 5, // 캐시는 5분 유지
      refetchOnMount: true, // 컴포넌트 마운트 시 refetch
      refetchOnWindowFocus: false, // 창에 다시 포커스할 때 리페치하지 않음 (깜빡임 감소)
      refetchOnReconnect: true, // 재연결 시 항상 refetch
      retry: 1,
    },
    mutations: {
      onSettled: (data, error, variables, context) => {
        // 모든 mutation이 완료된 후 자동으로 paper 쿼리를 무효화하여 최신 데이터로 갱신
        // 이 설정으로 인해 모든 mutation이 성공/실패 여부와 관계없이 paper 쿼리를 무효화

        // 약간의 지연 후 캐시 무효화 (서버 데이터 반영 시간 확보)
        setTimeout(() => {
          // 무효화만 수행하고 리페치는 하지 않음 (깜빡임 방지)
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
