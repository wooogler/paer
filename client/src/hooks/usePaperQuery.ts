import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPaper,
  updateSentenceContent,
  updateSentenceIntent,
  updateSentenceSummary,
  deleteSentence,
  addBlock,
  updateBlockIntent,
  updateBlockSummary,
  updateBlockTitle,
  deleteBlock,
} from "../api/paperApi";
import { useContentStore } from "../store/useContentStore";
import { useEffect } from "react";
import { Paper, Content, ContentType } from "@paer/shared";

// 새로 추가된 문장의 blockId를 저장하는 전역 변수
let newSentenceBlockId: string | null = null;

export function usePaperQuery() {
  const setContent = useContentStore((state) => state.setContent);

  const query = useQuery<Paper, Error>({
    queryKey: ["paper"],
    queryFn: fetchPaper,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    // 데이터가 성공적으로 로드되면 스토어에 저장
    if (query.data) {
      setContent(query.data);
    }
  }, [query.data, setContent]);

  return query;
}

// 새로 추가된 문장의 blockId를 가져오는 함수
export function getNewSentenceBlockId(): string | null {
  return newSentenceBlockId;
}

// 새로 추가된 문장의 blockId를 설정하는 함수
export function setNewSentenceBlockId(blockId: string | null): void {
  newSentenceBlockId = blockId;
}

// Sentence 업데이트를 위한 mutation hook
export const useUpdateSentence = () => {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async ({
      blockId,
      content,
      summary,
      intent,
    }: {
      blockId: string;
      content?: string;
      summary?: string;
      intent?: string;
    }) => {
      if (content !== undefined) {
        await updateSentenceContent(blockId, content);
      }
      if (summary !== undefined) {
        await updateSentenceSummary(blockId, summary);
      }
      if (intent !== undefined) {
        await updateSentenceIntent(blockId, intent);
      }
    },
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

      // 이후 쿼리 무효화 (즉시 새로고침)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
};

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

      // 이후 쿼리 무효화 (즉시 새로고침)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}

// Block intent 업데이트를 위한 mutation hook
export function useUpdateBlockIntent() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async ({
      targetBlockId,
      blockType,
      intent,
    }: {
      parentBlockId: string | null;
      targetBlockId: string;
      blockType: ContentType;
      intent: string;
    }) => {
      await updateBlockIntent(targetBlockId, blockType, intent);
    },
    onSuccess: async () => {
      try {
        const newData = await fetchPaper();
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}

// Block summary 업데이트를 위한 mutation hook
export function useUpdateBlockSummary() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async ({
      targetBlockId,
      blockType,
      summary,
    }: {
      parentBlockId: string | null;
      targetBlockId: string;
      blockType: ContentType;
      summary: string;
    }) => {
      await updateBlockSummary(targetBlockId, blockType, summary);
    },
    onSuccess: async () => {
      try {
        const newData = await fetchPaper();
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}

// Block title 업데이트를 위한 mutation hook
export function useUpdateBlockTitle() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async ({
      targetBlockId,
      blockType,
      title,
    }: {
      parentBlockId: string | null;
      targetBlockId: string;
      blockType: ContentType;
      title: string;
    }) => {
      await updateBlockTitle(targetBlockId, blockType, title);
    },
    onSuccess: async () => {
      try {
        const newData = await fetchPaper();
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
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

// Block 추가를 위한 mutation hook
export function useAddBlock() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async ({
      parentBlockId,
      prevBlockId,
      blockType,
    }: {
      parentBlockId: string | null;
      prevBlockId: string | null;
      blockType: ContentType;
    }) => {
      return await addBlock(parentBlockId, prevBlockId, blockType);
    },
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

      // 이후 쿼리 무효화 (즉시 새로고침)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}

// Block 삭제를 위한 mutation hook
export function useDeleteBlock() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: async (blockId: string) => {
      await deleteBlock(blockId);
    },
    onSuccess: async () => {
      // 서버에서 즉시 최신 데이터 가져오기
      try {
        const newData = await fetchPaper();

        // 캐시 직접 업데이트
        queryClient.setQueryData(["paper"], newData);

        // 스토어 직접 업데이트
        setContent(newData);

        // 현재 선택된 content가 있으면 해당 path로 다시 선택하여 UI 업데이트
        // 삭제된 블록이 선택되었던 경우 선택 해제
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          } else {
            // 경로가 더 이상 유효하지 않으면 선택 해제
            setSelectedContent(null, []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // 이후 쿼리 무효화 (즉시 새로고침)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}
