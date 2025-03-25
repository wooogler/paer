import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchPaper, updateSentenceContent } from "../api/paperApi";
import { useContentStore } from "../store/useContentStore";
import { useEffect } from "react";
import { Paper } from "@paer/shared";

export function usePaperQuery() {
  const setContent = useContentStore((state) => state.setContent);

  const query = useQuery<Paper, Error>({
    queryKey: ["paper"],
    queryFn: fetchPaper,
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

  return useMutation({
    mutationFn: ({ blockId, content }: { blockId: string; content: string }) =>
      updateSentenceContent(blockId, content),
    onSuccess: () => {
      // 업데이트 성공 후 paper 데이터 리페치
      queryClient.invalidateQueries({ queryKey: ["paper"] });
    },
  });
}
