import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { devtools } from "zustand/middleware";
import { Content, Paper } from "@paer/shared";

const initialContent: Paper = {
  title: "New Paper",
  summary: "",
  intent: "",
  type: "paper",
  content: [],
};

interface ContentState {
  content: Paper;
  selectedContent: Content | null;
  selectedPath: number[] | null;
  selectedBlock: Content | null;
  selectedBlockPath: number[] | null;
  parentContents: Content[]; // Parent contents of the selected content

  // Actions
  setContent: (content: Paper) => void;
  setSelectedContent: (content: Content | null, path: number[] | null) => void;
  setSelectedBlock: (content: Content | null, path: number[] | null) => void;
  updateContent: (blockId: string, updatedContent: Partial<Content>) => void;
  addContent: (
    path: number[],
    newContent: Content,
    insertIndex?: number
  ) => void;
  removeContent: (path: number[]) => void;
  getContentByPath: (path: number[]) => Content | null;
}

export const useContentStore = create<ContentState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial states
        content: initialContent,
        selectedContent: null,
        selectedPath: null,
        selectedBlock: null,
        selectedBlockPath: null,
        parentContents: [],

        // Actions
        setContent: (content) => {
          set({ content });
        },

        // Set selected content (for chat context) - does not change parent contents
        setSelectedContent: (content, path) => {
          return set({
            selectedContent: content,
            selectedPath: path,
          });
        },

        // Set selected block (for editor display) and also set selected content
        setSelectedBlock: (content, path) => {
          if (!content || !path) {
            return set({
              selectedBlock: null,
              selectedBlockPath: null,
              selectedContent: null,
              selectedPath: null,
              parentContents: [],
            });
          }

          const rootContent = get().content;
          const parentContents: Content[] = [];

          // Find parent contents based on path
          if (path.length > 0) {
            let current: Content = rootContent;
            parentContents.push(current); // paper level

            const currentPath: number[] = [];
            for (let i = 0; i < path.length - 1; i++) {
              currentPath.push(path[i]);
              if (!current.content || typeof current.content === "string")
                break;

              const nextContent = current.content[path[i]];
              if (nextContent) {
                current = nextContent;
                parentContents.push(current); // section or subsection level
              }
            }
          }

          return set({
            selectedBlock: content,
            selectedBlockPath: path,
            selectedContent: content, // 초기에는 selectedContent도 동일한 값으로 설정
            selectedPath: path,
            parentContents,
          });
        },

        // Get content by path
        getContentByPath: (path: number[]) => {
          const state = get();
          if (path.length === 0) return state.content as Content;

          let current: Content = state.content;

          for (let i = 0; i < path.length; i++) {
            if (!current.content || typeof current.content === "string")
              return null;
            const nextContent = current.content[path[i]];
            if (!nextContent) return null;
            current = nextContent;
          }

          return current;
        },

        // Update content by blockId
        updateContent: (blockId: string, updatedContent: Partial<Content>) =>
          set((state) => {
            const newContent = JSON.parse(
              JSON.stringify(state.content)
            ) as Paper; // Deep copy

            // Helper function to recursively find and update content by blockId
            const findAndUpdateContent = (
              content: Content | Paper,
              parents: Content[] = []
            ): {
              found: boolean;
              updatedContent: Content | null;
              updatedParents: Content[];
            } => {
              // Check if current content has the matching blockId
              if ("block-id" in content && content["block-id"] === blockId) {
                // Update the content object in place
                Object.assign(content, updatedContent);
                return {
                  found: true,
                  updatedContent: content as Content,
                  updatedParents: [...parents],
                };
              }

              // If content has children, search recursively
              if (content.content && Array.isArray(content.content)) {
                for (let i = 0; i < content.content.length; i++) {
                  const child = content.content[i];
                  const result = findAndUpdateContent(child, [
                    ...parents,
                    content as Content,
                  ]);

                  if (result.found) {
                    // Child was already updated in-place in the recursive call
                    return result;
                  }
                }
              }

              return { found: false, updatedContent: null, updatedParents: [] };
            };

            const result = findAndUpdateContent(newContent);

            if (!result.found) {
              return state; // No content found with the given blockId
            }

            // Update the selected content if it matches the blockId
            const updatedSelectedContent =
              state.selectedContent?.["block-id"] === blockId
                ? { ...state.selectedContent, ...result.updatedContent }
                : state.selectedContent;

            // Update parent contents if needed
            const updatedParentContents = state.selectedPath
              ? result.updatedParents
              : state.parentContents;

            return {
              content: newContent,
              selectedContent: updatedSelectedContent,
              parentContents: updatedParentContents,
            };
          }),

        // Add new content at specific path
        addContent: (
          path: number[],
          newContent: Content,
          insertIndex?: number
        ) =>
          set((state) => {
            const contentCopy = JSON.parse(
              JSON.stringify(state.content)
            ) as Paper;
            let current: Content = contentCopy;

            // Search path
            for (let i = 0; i < path.length; i++) {
              if (!current.content || typeof current.content === "string")
                return state;
              const nextContent = current.content[path[i]];
              if (!nextContent) return state;
              current = nextContent;
            }

            // Add new content
            if (!current.content) {
              current.content = [];
            } else if (typeof current.content === "string") {
              return state; // Cannot add to string
            }

            // If insertIndex is provided, insert at that position, otherwise push to the end
            if (insertIndex !== undefined && Array.isArray(current.content)) {
              // Ensure insertIndex is valid (between 0 and array length)
              const validIndex = Math.max(
                0,
                Math.min(insertIndex, current.content.length)
              );
              current.content.splice(validIndex, 0, newContent);
            } else {
              current.content.push(newContent);
            }

            return {
              content: contentCopy,
              // If we're adding to the currently selected content, update the parentContents
              parentContents:
                state.selectedPath &&
                path.join(",").startsWith(state.selectedPath.join(","))
                  ? [...state.parentContents]
                  : state.parentContents,
            };
          }),

        // Remove content at specific path
        removeContent: (path: number[]) =>
          set((state) => {
            const contentCopy = JSON.parse(
              JSON.stringify(state.content)
            ) as Paper;
            let current: Content = contentCopy;

            // Navigate to the target path except last index
            for (let i = 0; i < path.length - 1; i++) {
              if (!current.content || typeof current.content === "string")
                return state;
              const nextContent = current.content[path[i]];
              if (!nextContent) return state;
              current = nextContent;
            }

            // Remove the last index content
            if (!current.content || typeof current.content === "string")
              return state;

            const lastIndex = path[path.length - 1];
            current.content.splice(lastIndex, 1);

            return { content: contentCopy };
          }),
      }),
      {
        name: "content-storage", // Name to save in localStorage
        storage: createJSONStorage(() => localStorage), // Use browser's localStorage
        partialize: (state) => ({
          // Select only states to store
          selectedContent: state.selectedContent,
          selectedPath: state.selectedPath,
          selectedBlock: state.selectedBlock,
          selectedBlockPath: state.selectedBlockPath,
          parentContents: state.parentContents,
        }),
      }
    ),
    { name: "Content Store" } // Redux DevTools에 표시될 이름
  )
);
