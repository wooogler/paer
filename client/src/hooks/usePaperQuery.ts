import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPaper,
  updateSentenceContent,
  updateSentenceSummary,
  updateSentenceIntent,
  addSentenceAfter,
  deleteSentence,
  addBlock,
  updateBlockIntent,
  updateBlockSummary,
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

// 새 Sentence 추가를 위한 mutation hook
export function useAddSentence() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();

  return useMutation({
    mutationFn: (blockId: string | null) => addSentenceAfter(blockId),
    onSuccess: async (_, blockId) => {
      // 서버에서 즉시 최신 데이터 가져오기
      try {
        const newData = await fetchPaper();

        // 새로 추가된 문장의 blockId 찾기
        const addedSentenceBlockId = findNewSentenceBlockId(newData, blockId);
        if (addedSentenceBlockId) {
          // 전역 변수에 저장
          setNewSentenceBlockId(addedSentenceBlockId);
        }

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

// 새로 추가된 문장의 blockId를 찾는 함수
function findNewSentenceBlockId(
  data: Paper,
  prevBlockId: string | null
): string | null {
  if (prevBlockId === null) {
    // 첫 문장으로 추가한 경우, 첫 번째 paragraph의 첫 번째 문장의 blockId 찾기
    return findFirstSentenceBlockId(data);
  }

  // prevBlockId 다음에 추가된 문장의 blockId 찾기
  return findNextSentenceBlockId(data, prevBlockId);
}

// 첫 번째 문장의 blockId 찾기
function findFirstSentenceBlockId(content: Content | Paper): string | null {
  if (
    content.type === "paragraph" &&
    content.content &&
    Array.isArray(content.content)
  ) {
    // 첫 번째 문장이 있으면 그 blockId 반환
    if (content.content.length > 0) {
      const firstSentence = content.content[0];
      if (
        typeof firstSentence !== "string" &&
        firstSentence.type === "sentence" &&
        firstSentence["block-id"]
      ) {
        return firstSentence["block-id"] as string;
      }
    }
    return null;
  }

  // 재귀적으로 모든 콘텐츠 확인
  if (content.content && Array.isArray(content.content)) {
    for (const child of content.content) {
      if (typeof child !== "string") {
        const blockId = findFirstSentenceBlockId(child);
        if (blockId) {
          return blockId;
        }
      }
    }
  }

  return null;
}

// prevBlockId 다음에 추가된 문장의 blockId 찾기
function findNextSentenceBlockId(
  content: Content | Paper,
  prevBlockId: string
): string | null {
  if (content.content && Array.isArray(content.content)) {
    for (let i = 0; i < content.content.length; i++) {
      const child = content.content[i];

      if (typeof child === "string") continue;

      // 이전 블록을 찾음
      if (child["block-id"] === prevBlockId && child.type === "sentence") {
        // 다음 인덱스에 문장이 있는지 확인
        if (i + 1 < content.content.length) {
          const nextSentence = content.content[i + 1];
          if (
            typeof nextSentence !== "string" &&
            nextSentence.type === "sentence" &&
            nextSentence["block-id"]
          ) {
            // 다음 문장의 blockId 반환
            return nextSentence["block-id"] as string;
          }
        }
      }

      // 재귀적으로 탐색
      const blockId = findNextSentenceBlockId(child, prevBlockId);
      if (blockId) {
        return blockId;
      }
    }
  }

  return null;
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
      parentBlockId,
      targetBlockId,
      blockType,
      intent,
    }: {
      parentBlockId: string | null;
      targetBlockId: string;
      blockType: ContentType;
      intent: string;
    }) => {
      await updateBlockIntent(parentBlockId, targetBlockId, blockType, intent);
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
      parentBlockId,
      targetBlockId,
      blockType,
      summary,
    }: {
      parentBlockId: string | null;
      targetBlockId: string;
      blockType: ContentType;
      summary: string;
    }) => {
      await updateBlockSummary(
        parentBlockId,
        targetBlockId,
        blockType,
        summary
      );
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
