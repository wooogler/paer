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
import { Paper, ContentType } from "@paer/shared";

// Global variable to store the blockId of the newly added sentence
let newSentenceBlockId: string | null = null;

export function usePaperQuery() {
  const setContent = useContentStore((state) => state.setContent);

  console.log("[usePaperQuery] 초기화");

  const query = useQuery<Paper, Error>({
    queryKey: ["paper"],
    queryFn: fetchPaper,
    staleTime: 1000,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchInterval: 5000,
  });

  useEffect(() => {
    // Store in the state when data is loaded successfully
    if (query.data) {
      console.log("[usePaperQuery] 데이터 로드됨, Zustand 상태 업데이트");
      setContent(query.data);
      console.log("[usePaperQuery] Zustand 상태 업데이트 완료");
    }
  }, [query.data, setContent]);

  // 이전 데이터와 비교하여 강제 업데이트가 필요한지 확인
  useEffect(() => {
    if (query.data) {
      console.log("[usePaperQuery] 데이터 변경 감지: ", query.dataUpdatedAt);
    }
  }, [query.dataUpdatedAt]);

  return query;
}

// Function to get the blockId of the newly added sentence
export function getNewSentenceBlockId(): string | null {
  return newSentenceBlockId;
}

// Function to set the blockId of the newly added sentence
export function setNewSentenceBlockId(blockId: string | null): void {
  newSentenceBlockId = blockId;
}

// Mutation hook for updating sentences
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
      // Make a single API call to update all fields
      await updateSentenceContent(
        blockId,
        content || "",
        summary || "",
        intent || ""
      );
    },
    onSuccess: async () => {
      try {
        // Fetch latest data from server immediately
        const newData = await fetchPaper();

        // Update both cache and state with the new data
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        // If current selected content exists, select it again to update UI
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }

        // Invalidate query to ensure all components are updated
        await queryClient.invalidateQueries({
          queryKey: ["paper"],
          exact: true,
          refetchType: "active",
        });
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }
    },
  });
};

// Sentence deletion mutation hook
export function useDeleteSentence() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: (blockId: string) => deleteSentence(blockId),
    onSuccess: async () => {
      // Fetch latest data from server immediately
      try {
        const newData = await fetchPaper();

        // Cache directly update
        queryClient.setQueryData(["paper"], newData);

        // State directly update
        setContent(newData);

        // If current selected content exists, select it again to update UI
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // Invalidate query immediately (refresh immediately)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}

// Block intent update mutation hook
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

// Block summary update mutation hook
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

// Block title update mutation hook
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

// Helper function to find content based on path
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

// Block addition mutation hook
export function useAddBlock() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  console.log("[useAddBlock] 초기화");

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
      console.log(
        `[useAddBlock] mutationFn 실행: 타입=${blockType} parent=${parentBlockId} prev=${prevBlockId}`
      );
      return await addBlock(parentBlockId, prevBlockId, blockType);
    },
    onSuccess: async (newBlockId) => {
      console.log("[useAddBlock] onSuccess 시작: ID=", newBlockId);

      try {
        // 중요: 서버에서 새 데이터를 가져오기 전에 잠시 대기
        // 이는 서버가 데이터베이스에 변경사항을 저장하고 반영할 시간을 확보합니다
        await new Promise((resolve) => setTimeout(resolve, 300));

        // 데이터 가져오기를 한 번만 수행
        console.log("[useAddBlock] 서버에서 새 데이터 가져오기 시작");
        const newData = await fetchPaper();
        console.log("[useAddBlock] 새 데이터 가져오기 완료:", newData);

        // 캐시 및 상태 업데이트를 한 번에 처리
        console.log("[useAddBlock] 캐시 및 상태 업데이트 시작");
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        // 선택된 콘텐츠 업데이트
        if (selectedContent && selectedPath) {
          console.log(
            "[useAddBlock] 선택된 콘텐츠 업데이트 시작:",
            selectedPath
          );
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
            console.log("[useAddBlock] 선택된 콘텐츠 업데이트 완료");
          } else {
            console.log("[useAddBlock] 선택된 콘텐츠를 찾을 수 없음");
          }
        }

        // 단일 invalidateQueries 호출로 최적화
        console.log("[useAddBlock] 쿼리 무효화 시작");
        queryClient.invalidateQueries({
          queryKey: ["paper"],
          refetchType: "none", // 우선 무효화만 하고 리페치는 하지 않음
        });

        console.log("[useAddBlock] 모든 쿼리 리프레시 완료");
      } catch (error) {
        console.error("[useAddBlock] 업데이트 오류:", error);
      }

      console.log("[useAddBlock] onSuccess 종료");
    },
    onError: (error) => {
      console.error("[useAddBlock] 오류 발생:", error);
    },
  });
}

// Block deletion mutation hook
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
      // Fetch latest data from server immediately
      try {
        const newData = await fetchPaper();

        // Cache directly update
        queryClient.setQueryData(["paper"], newData);

        // State directly update
        setContent(newData);

        // If current selected content exists, select it again to update UI
        // If the deleted block was selected, deselect it
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(newData, selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          } else {
            // If the path is no longer valid, deselect it
            setSelectedContent(null, []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // Invalidate query immediately (refresh immediately)
      queryClient.invalidateQueries({
        queryKey: ["paper"],
        exact: true,
        refetchType: "active",
      });
    },
  });
}
