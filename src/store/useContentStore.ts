import { create } from "zustand";
import { Content } from "../types/content";
import testContent from "../data/testContent.json";

// Initial test content is now imported from JSON file
const typedTestContent = testContent as Content;

interface ContentState {
  content: Content;
  selectedContent: Content | null;
  selectedPath: number[] | null;
  parentContents: Content[]; // Parent contents of the selected content

  // Actions
  setContent: (content: Content) => void;
  setSelectedContent: (content: Content | null, path: number[] | null) => void;
  updateContent: (path: number[], updatedContent: Partial<Content>) => void;
  addContent: (path: number[], newContent: Content) => void;
  removeContent: (path: number[]) => void;
  getContentByPath: (path: number[]) => Content | null;
}

export const useContentStore = create<ContentState>((set, get) => ({
  // Initial states
  content: typedTestContent, // Using typed test content
  selectedContent: null,
  selectedPath: null,
  parentContents: [],

  // Actions
  setContent: (content) => set({ content }),

  // Set selected content and find parent contents
  setSelectedContent: (content, path) => {
    if (!content || !path) {
      return set({
        selectedContent: null,
        selectedPath: null,
        parentContents: [],
      });
    }

    const rootContent = get().content;
    const parentContents: Content[] = [];

    // Find parent contents based on path
    if (path.length > 0) {
      let current = rootContent;
      parentContents.push(current); // paper level

      const currentPath: number[] = [];
      for (let i = 0; i < path.length - 1; i++) {
        currentPath.push(path[i]);
        if (!current.content || typeof current.content === "string") break;

        current = current.content[path[i]];
        if (current) {
          parentContents.push(current); // section or subsection level
        }
      }
    }

    return set({
      selectedContent: content,
      selectedPath: path,
      parentContents,
    });
  },

  // Get content by path
  getContentByPath: (path: number[]) => {
    const state = get();
    let current = state.content;

    for (let i = 0; i < path.length; i++) {
      if (!current.content || typeof current.content === "string") return null;
      current = current.content[path[i]];
    }

    return current || null;
  },

  // Update content at specific path
  updateContent: (path: number[], updatedContent: Partial<Content>) =>
    set((state) => {
      const newContent = JSON.parse(JSON.stringify(state.content)); // Deep copy
      let current = newContent;

      // Navigate to the target path except last index
      for (let i = 0; i < path.length - 1; i++) {
        if (!current.content || typeof current.content === "string")
          return state;
        current = current.content[path[i]];
      }

      // Update the last index content
      if (!current.content || typeof current.content === "string") return state;

      const lastIndex = path[path.length - 1];
      current.content[lastIndex] = {
        ...current.content[lastIndex],
        ...updatedContent,
      };

      // Update selected content and parent contents
      let updatedSelectedContent = state.selectedContent;
      let updatedParentContents = [...state.parentContents];

      // Check if the updated path matches the selected path
      if (state.selectedPath) {
        const selectedPath = state.selectedPath;
        const updatePath = [...path];
        updatePath.pop(); // Remove last index

        // If the updated path affects the selected path
        if (
          selectedPath.length > 0 &&
          selectedPath.join(",").startsWith(updatePath.join(","))
        ) {
          // Search entire content to reset
          let selectedCurrent = newContent;
          updatedParentContents = [newContent]; // Add root (paper) level

          const currentPath: number[] = [];
          for (let i = 0; i < selectedPath.length; i++) {
            if (
              !selectedCurrent.content ||
              typeof selectedCurrent.content === "string"
            )
              break;

            if (i < selectedPath.length - 1) {
              currentPath.push(selectedPath[i]);
              selectedCurrent = selectedCurrent.content[selectedPath[i]];
              if (selectedCurrent) {
                updatedParentContents.push(selectedCurrent);
              }
            } else {
              updatedSelectedContent = selectedCurrent.content[selectedPath[i]];
            }
          }
        }
      }

      return {
        content: newContent,
        selectedContent: updatedSelectedContent,
        parentContents: updatedParentContents,
      };
    }),

  // Add new content at specific path
  addContent: (path: number[], newContent: Content) =>
    set((state) => {
      const content = { ...state.content };
      let current = content;

      // Search path
      for (let i = 0; i < path.length; i++) {
        if (!current.content || typeof current.content === "string")
          return state;
        current = current.content[path[i]];
      }

      // Add new content
      if (!current.content) {
        current.content = [];
      } else if (typeof current.content === "string") {
        return state; // Cannot add to string
      }

      current.content.push(newContent);

      return { content };
    }),

  // Remove content at specific path
  removeContent: (path: number[]) =>
    set((state) => {
      const content = { ...state.content };
      let current = content;

      // Navigate to the target path except last index
      for (let i = 0; i < path.length - 1; i++) {
        if (!current.content || typeof current.content === "string")
          return state;
        current = current.content[path[i]];
      }

      // Remove the last index content
      if (!current.content || typeof current.content === "string") return state;

      const lastIndex = path[path.length - 1];
      current.content.splice(lastIndex, 1);

      return { content };
    }),
}));
