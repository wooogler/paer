import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPaper,
  updateSentenceContent,
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
import { isValidObjectId } from "../utils/validation";
import { useAppStore } from "../store/useAppStore";

// Global variable to store the blockId of the newly added sentence
let newSentenceBlockId: string | null = null;

export function usePaperQuery(userName: string) {
  const setContent = useContentStore((state) => state.setContent);
  const setLoading = useContentStore((state) => state.setLoading);
  const userId = useAppStore((state) => state.userId);

  const query = useQuery<Paper, Error>({
    queryKey: ["paper", userId],
    queryFn: () => fetchPaper(userId),
    staleTime: 1000,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    enabled: !!userId && isValidObjectId(userId),
  });

  useEffect(() => {
    // Store in the state when data is loaded successfully
    if (query.data) {
      setContent(query.data);
    }
    // 로딩 상태 업데이트 - isPending 또는 isLoading 중 하나라도 true이면 로딩 중으로 간주
    const isCurrentlyLoading =
      query.isLoading || query.isPending || query.isFetching;
    setLoading(isCurrentlyLoading);

    // 디버깅용 로그
    if (isCurrentlyLoading) {
      console.log("Paper data is loading...");
    }
  }, [
    query.data,
    query.isLoading,
    query.isPending,
    query.isFetching,
    setContent,
    setLoading,
  ]);

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
  const userId = useAppStore((state) => state.userId);

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
        const newData = await fetchPaper(userId);

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
  const userId = useAppStore((state) => state.userId);

  return useMutation({
    mutationFn: (blockId: string) => deleteSentence(blockId),
    onSuccess: async () => {
      // Fetch latest data from server immediately
      try {
        const newData = await fetchPaper(userId);

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
  const userId = useAppStore((state) => state.userId);

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
        const newData = await fetchPaper(userId);
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
  const userId = useAppStore((state) => state.userId);

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
        const newData = await fetchPaper(userId);
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
  const userId = useAppStore((state) => state.userId);

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
        const newData = await fetchPaper(userId);
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
  const userId = useAppStore((state) => state.userId);

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
    onSuccess: async (newBlockId) => {
      try {
        const newData = await fetchPaper(userId);
        queryClient.setQueryData(["paper"], newData);
        setContent(newData);

        // If the current selected content exists, select it again to update UI
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

// Block deletion mutation hook
export function useDeleteBlock() {
  const queryClient = useQueryClient();
  const setContent = useContentStore((state) => state.setContent);
  const { selectedContent, selectedPath, setSelectedContent } =
    useContentStore();
  const userId = useAppStore((state) => state.userId);

  return useMutation({
    mutationFn: (blockId: string) => deleteBlock(blockId),
    onSuccess: async () => {
      try {
        const newData = await fetchPaper(userId);
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
