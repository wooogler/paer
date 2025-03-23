import { create } from "zustand";
import { Content } from "../types/content";

// Initial test content
const testContent: Content = {
  title: "AI-Powered Writing Assistant",
  summary: "This paper introduces a novel approach to structured writing",
  intent: "To present a new methodology for structured writing",
  type: "paper",
  content: [
    {
      title: "Introduction",
      summary: "Background and motivation",
      intent: "To provide context and motivation",
      type: "section",
      content: [
        {
          title: "Background",
          summary: "Current state of writing tools",
          intent: "To explain the current landscape",
          type: "subsection",
          content: [
            {
              summary: "Writing is a complex task that requires",
              intent: "To explain the complexity of writing",
              type: "paragraph",
              content: [
                {
                  summary: "Modern writing tools lack structured approach",
                  intent: "To point out the limitation",
                  type: "sentence",
                  content:
                    "Modern writing tools often lack a structured approach, leading to disorganized documents and reduced clarity.",
                },
                {
                  summary: "Writers need better organization tools",
                  intent: "To identify the need",
                  type: "sentence",
                  content:
                    "Professional writers and researchers need better organization tools to improve their workflow and document quality.",
                },
              ],
            },
            {
              summary: "Current solutions are insufficient",
              intent: "To highlight the gap in existing solutions",
              type: "paragraph",
              content: [
                {
                  summary: "Existing tools focus on formatting",
                  intent: "To describe current limitations",
                  type: "sentence",
                  content:
                    "Most existing writing tools focus primarily on formatting and basic organization, neglecting the deeper structural needs of complex documents.",
                },
                {
                  summary: "Need for semantic structure",
                  intent: "To explain the need for better structure",
                  type: "sentence",
                  content:
                    "There is a growing need for tools that understand and support the semantic structure of documents, beyond simple formatting and outlining.",
                },
              ],
            },
          ],
        },
        {
          title: "Problem Statement",
          summary: "Key challenges in document structuring",
          intent: "To define the problem space",
          type: "subsection",
          content: [
            {
              summary: "Challenges in maintaining document coherence",
              intent: "To explain document coherence issues",
              type: "paragraph",
              content: [
                {
                  summary: "Documents lack logical flow",
                  intent: "To describe coherence problems",
                  type: "sentence",
                  content:
                    "Many documents suffer from a lack of logical flow and connection between different sections and ideas.",
                },
                {
                  summary: "Writers struggle with organization",
                  intent: "To highlight writer challenges",
                  type: "sentence",
                  content:
                    "Writers often struggle to maintain a clear organizational structure throughout their documents, especially in longer texts.",
                },
              ],
            },
          ],
        },
      ],
    },
    {
      title: "Methodology",
      summary: "Our approach to structured writing",
      intent: "To explain our solution",
      type: "section",
      content: [
        {
          title: "System Architecture",
          summary: "Overview of the system",
          intent: "To describe the system design",
          type: "subsection",
          content: [
            {
              summary: "The system consists of three main components...",
              intent: "To outline system components",
              type: "paragraph",
              content: [
                {
                  summary: "The structure component manages document hierarchy",
                  intent: "To explain the structure component",
                  type: "sentence",
                  content:
                    "The structure component manages the hierarchical organization of the document, allowing users to visualize and navigate through different sections.",
                },
                {
                  summary: "The editor component handles content creation",
                  intent: "To explain the editor component",
                  type: "sentence",
                  content:
                    "The editor component provides a focused environment for content creation, with context-aware tools tailored to the specific document section.",
                },
                {
                  summary: "The AI assistant provides writing suggestions",
                  intent: "To explain the AI component",
                  type: "sentence",
                  content:
                    "The AI assistant analyzes document structure and content to provide contextually relevant suggestions, improving writing quality and cohesion.",
                },
              ],
            },
            {
              summary: "Integration of components",
              intent: "To explain component integration",
              type: "paragraph",
              content: [
                {
                  summary: "Seamless interaction between components",
                  intent: "To describe component interaction",
                  type: "sentence",
                  content:
                    "All components work together seamlessly, sharing context and information to provide a unified writing experience.",
                },
                {
                  summary: "Real-time updates and feedback",
                  intent: "To explain system responsiveness",
                  type: "sentence",
                  content:
                    "The system provides real-time updates and feedback as users write and organize their documents, ensuring immediate response to changes.",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

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
  content: testContent, // Using test content
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
