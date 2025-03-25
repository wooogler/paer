import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPaper,
  updateSentenceContent,
  addSentenceAfter,
  deleteSentence,
} from "../api/paperApi";
import { useContentStore } from "../store/useContentStore";
import { useEffect } from "react";
import { Paper } from "@paer/shared";

export function usePaperQuery() {
  const setContent = useContentStore((state) => state.setContent);

  const query = useQuery<Paper, Error>({
    queryKey: ["paper"],
    queryFn: fetchPaper,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    // 데이터가 성공적으로 로드되면 스토어에 저장
    if (query.data) {
      setContent(query.data);
    }
  }, [query.data, setContent]);

  return query;
}

// Sentence 업데이트를 위한 mutation hook
export function useUpdateSentence() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);

  return useMutation({
    mutationFn: ({ blockId, content }: { blockId: string; content: string }) =>
      updateSentenceContent(blockId, content),
    onSuccess: async () => {
      // 서버에서 즉시 최신 데이터 가져오기
      try {
        const newData = await fetchPaper();

        // 캐시 직접 업데이트
        queryClient.setQueryData(["paper"], newData);

        // 스토어 직접 업데이트
        setContent(newData);
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // 이후 쿼리 무효화 (백그라운드에서 추가적인 새로고침)
      queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });
}

// 새 Sentence 추가를 위한 mutation hook
export function useAddSentence() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: (blockId: string | null) => addSentenceAfter(blockId),
    onSuccess: async () => {
      // 서버에서 즉시 최신 데이터 가져오기
      try {
        const newData = await fetchPaper();

        // 캐시 직접 업데이트
        queryClient.setQueryData(["paper"], newData);

        // 스토어 직접 업데이트
        setContent(newData);

        // 현재 선택된 content가 있으면 해당 path로 다시 선택하여 UI 업데이트
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // 이후 쿼리 무효화 (백그라운드에서 추가적인 새로고침)
      queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });
}

// 문장 삭제를 위한 mutation hook
export function useDeleteSentence() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: (blockId: string) => deleteSentence(blockId),
    onSuccess: async () => {
      // 서버에서 즉시 최신 데이터 가져오기
      try {
        const newData = await fetchPaper();

        // 캐시 직접 업데이트
        queryClient.setQueryData(["paper"], newData);

        // 스토어 직접 업데이트
        setContent(newData);

        // 현재 선택된 content가 있으면 해당 path로 다시 선택하여 UI 업데이트
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // 이후 쿼리 무효화 (백그라운드에서 추가적인 새로고침)
      queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });
}

// 경로를 기반으로 콘텐츠를 찾는 헬퍼 함수
function findContentByPath(rootContent: any, path: number[]): any {
  let current = rootContent;
  for (let i = 0; i < path.length; i++) {
    if (!current.content || typeof current.content === "string") {
      return null;
    }

    if (path[i] >= current.content.length) {
      return null;
    }

    current = current.content[path[i]];
  }
  return current;
}
