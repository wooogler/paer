import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getPapers,
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
import { ContentType } from "@paer/shared";
import { useAppStore } from "../store/useAppStore";
import { isValidObjectId } from "../utils/validation";


// Global variable to store the blockId of the newly added sentence
let newSentenceBlockId: string | null = null;

export const usePaperQuery = () => {
  const userId = useAppStore((state) => state.userId);
  const setContent = useContentStore((state) => state.setContent);
  const setLoading = useContentStore((state) => state.setLoading);
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

  const query = useQuery({
    queryKey: ["papers", userId],
    queryFn: () => {
      if (typeof userId !== "string" || !userId) {
        throw new Error("Invalid userId");
      }
      return getPapers(userId);
    },
    enabled: typeof userId === "string" && !!userId && isValidObjectId(userId),
    staleTime: 1000,
    gcTime: 1000 * 60 * 5,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (query.data) {
      // 항상 최신 데이터로 업데이트
      const papers = Array.isArray(query.data) ? query.data : [query.data];
      const selectedPaper = selectedPaperId 
        ? papers.find(paper => paper._id === selectedPaperId)
        : papers[0]; // If no selectedPaperId, use the first paper
      
      if (selectedPaper) {
        setContent(selectedPaper);

        // 디버깅을 위한 로그 추가
        console.log("Paper data updated:", selectedPaper);
      }
    }
    const isCurrentlyLoading =
      query.isLoading || query.isPending || query.isFetching;
    setLoading(isCurrentlyLoading);

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
    selectedPaperId,
  ]);

  return query;
};

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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

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
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        // Update both cache and state with the new data
        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        // If current selected content exists, select it again to update UI
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }

        // Invalidate query to ensure all components are updated
        await queryClient.invalidateQueries({
          queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

  return useMutation({
    mutationFn: (blockId: string) => deleteSentence(blockId),
    onSuccess: async () => {
      // Fetch latest data from server immediately
      try {
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        // Cache directly update
        queryClient.setQueryData(["papers", userId], newData);

        // State directly update
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        // If current selected content exists, select it again to update UI
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      // Invalidate query immediately (refresh immediately)
      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

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
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

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
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

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
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

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
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        // If the current selected content exists, select it again to update UI
        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
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
  const selectedPaperId = useContentStore((state) => state.selectedPaperId);

  return useMutation({
    mutationFn: (blockId: string) => deleteBlock(blockId),
    onSuccess: async () => {
      try {
        const newData = await getPapers(userId);
        const selectedPaper = selectedPaperId 
          ? newData.find(paper => paper._id === selectedPaperId)
          : newData[0];

        queryClient.setQueryData(["papers", userId], newData);
        if (selectedPaper) {
          setContent(selectedPaper);
        }

        if (selectedContent && selectedPath) {
          const refreshedContent = findContentByPath(selectedPaper || newData[0], selectedPath);
          if (refreshedContent) {
            setSelectedContent(refreshedContent, selectedPath);
          }
        }
      } catch (error) {
        console.error("Failed to fetch updated data:", error);
      }

      queryClient.invalidateQueries({
        queryKey: ["papers", userId],
        exact: true,
        refetchType: "active",
      });
    },
  });
}
