import { ContentTypeSchema, Paper, ContentType, Content } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";
import { LLMService } from "./llmService";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private llmService: LLMService;

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
    this.llmService = new LLMService();
  }

  async getPaper(): Promise<Paper> {
    return this.paperRepository.getPaper();
  }

  async updateSentence(blockId: string): Promise<void> {
    const parentId: string = this.paperRepository.findParentBlockIdByChildId(
      null,
      blockId
    );
    const contextValue: string = this.paperRepository.getChildrenValues(
      parentId,
      "content"
    );
    return this.autoUpdateParentBlock(parentId, contextValue);
  }

  async autoUpdateParentBlock(blockId: string, blockContent: string) {
    await this.updateBlock(
      blockId,
      "summary",
      await this.llmService.summarizeText(blockContent)
    );
    await this.updateBlock(
      blockId,
      "intent",
      await this.llmService.findIntent(blockContent)
    );
  }

  async addBlock(
    parentBlockId: string | null,
    prevBlockId: string | null,
    blockType: ContentType
  ): Promise<string> {
    return this.paperRepository.addBlock(parentBlockId, prevBlockId, blockType);
  }

  async updateBlock(
    targetBlockId: string,
    keyToUpdate: string,
    updatedValue: string
  ): Promise<void> {
    return this.paperRepository.updateBlock(
      targetBlockId,
      keyToUpdate,
      updatedValue
    );
  }

  /**
   * Delete a sentence
   * @param blockId ID of the sentence to delete
   */
  async deleteSentence(blockId: string): Promise<void> {
    return this.paperRepository.deleteSentence(blockId);
  }

  /**
   * Delete a block
   * @param blockId ID of the block to delete
   */
  async deleteBlock(blockId: string): Promise<void> {
    return this.paperRepository.deleteBlock(blockId);
  }

  async savePaper(paper: Paper): Promise<void> {
    try {
      await fs.writeFile(
        this.paperPath,
        JSON.stringify(paper, null, 2),
        "utf-8"
      );
    } catch (error) {
      console.error("Error saving paper:", error);
      throw new Error("Failed to save paper");
    }
  }

  /**
   * Initialize the conversation with the paper context
   */
  async initializeConversation(): Promise<void> {
    try {
      const paper = await this.paperRepository.getPaper();
      const paperContent = this.paperRepository.getChildrenValues(
        paper["block-id"] || "root",
        "content"
      );
      await this.llmService.initializeConversation(paperContent);
    } catch (error) {
      console.error("Error initializing conversation:", error);
      throw new Error("Failed to initialize conversation");
    }
  }

  async askLLM(
    text: string,
    renderedContent?: string,
    blockId?: string
  ): Promise<any> {
    return this.llmService.askLLM(text, renderedContent, blockId);
  }

  /**
   * Convert paper JSON back to LaTeX format
   */
  async exportToLatex(paper: Paper): Promise<string> {
    let latexContent = "";

    // Add document class and packages
    latexContent += "\\documentclass{article}\n";
    latexContent += "\\usepackage{amsmath}\n";
    latexContent += "\\usepackage{amssymb}\n";
    latexContent += "\\usepackage{graphicx}\n\n";

    // Add title
    latexContent += `\\title{${paper.title}}\n\n`;

    // Add document begin
    latexContent += "\\begin{document}\n";
    latexContent += "\\maketitle\n\n";

    // Helper function to process paragraphs
    const processParagraph = (paragraph: any): string => {
      if (
        !paragraph ||
        typeof paragraph === "string" ||
        !Array.isArray(paragraph.content)
      ) {
        return "";
      }

      const sentences = paragraph.content
        .filter((s: any) => s && typeof s !== "string" && s.type === "sentence")
        .map((s: any) => s.content)
        .join(" ");

      return sentences ? `${sentences}\n\n` : "";
    };

    // Process each section
    for (const section of paper.content) {
      if (typeof section === "string") continue;

      // Add section title
      latexContent += `\\section{${section.title}}\n\n`;

      // Process content based on type
      if (section.type === "section" && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === "string") continue;

          if (item.type === "subsection") {
            // Handle subsection
            latexContent += `\\subsection{${item.title}}\n\n`;

            // Process paragraphs or subsubsections in subsection
            if (Array.isArray(item.content)) {
              for (const subItem of item.content) {
                if (typeof subItem === "string") continue;

                if (subItem.type === "subsubsection") {
                  // Handle subsubsection
                  latexContent += `\\subsubsection{${subItem.title}}\n\n`;

                  // Process paragraphs in subsubsection
                  if (Array.isArray(subItem.content)) {
                    for (const paragraph of subItem.content) {
                      latexContent += processParagraph(paragraph);
                    }
                  }
                } else if (subItem.type === "paragraph") {
                  // Handle paragraphs directly in subsection
                  latexContent += processParagraph(subItem);
                }
              }
            }
          } else if (item.type === "paragraph") {
            // Handle paragraphs directly in section
            latexContent += processParagraph(item);
          }
        }
      }
    }

    // Add document end
    latexContent += "\\end{document}";

    return latexContent;
  }

  private async findBlockById(blockId: string): Promise<Content | null> {
    const paper = await this.paperRepository.getPaper();
    if (!paper) return null;

    const findBlock = (content: Content): Content | null => {
      if (content["block-id"] === blockId) return content;
      if (Array.isArray(content.content)) {
        for (const child of content.content) {
          const found = findBlock(child);
          if (found) return found;
        }
      }
      return null;
    };

    return findBlock(paper);
  }

  async updateRenderedSummaries(renderedContent: string, blockId: string) {
    try {
      const block = await this.findBlockById(blockId);
      if (!block) {
        throw new Error("Block not found");
      }

      const result = await this.llmService.updateRenderedSummaries(block);

      // Get the paper and directly replace the target block with the LLM result
      const paper = await this.paperRepository.getPaper();

      // Replace the block in the paper structure with the LLM result
      const replaceBlock = (content: any): boolean => {
        if (typeof content === "string") return false;

        // If this is the target block, replace it
        if (content["block-id"] === blockId) {
          Object.assign(content, result.apiResponse.parsedResult);
          return true;
        }

        // Otherwise check children
        if (Array.isArray(content.content)) {
          for (let i = 0; i < content.content.length; i++) {
            if (content.content[i] && typeof content.content[i] !== "string") {
              if (replaceBlock(content.content[i])) {
                return true;
              }
            }
          }
        }

        return false;
      };

      // Start replacement from the root
      if (paper) {
        replaceBlock(paper);
      }

      // Save the updated paper
      await this.savePaper(paper);

      return result;
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      throw error;
    }
  }
}
