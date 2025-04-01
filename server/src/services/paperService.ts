import { ContentTypeSchema, Paper, ContentType, Content } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";
import { LLMService } from "./llmService";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private llmService: LLMService;
  private batchSize: number = 5; // Process 5 items at a time

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

  async updateWhole(): Promise<void> {
    try {
      const paper = await this.paperRepository.getPaper();
      const updateContentRecursively = async (
        contentArray: any[]
      ): Promise<void> => {
        for (const item of contentArray) {
          if (item.type === "paragraph" && item.content) {
            const content = this.paperRepository.getChildrenValues(
              item["block-id"],
              "content"
            );
            await this.updateBlock(
              item["block-id"],
              "summary",
              await this.llmService.summarizeText(content)
            );
            await this.updateBlock(
              item["block-id"],
              "intent",
              await this.llmService.findIntent(content)
            );
          }

          if (Array.isArray(item.content)) {
            await updateContentRecursively(item.content);
          }
        }
      };

      await updateContentRecursively(paper.content);
      await this.savePaper(paper);
    } catch (error) {
      console.error("Error updating the whole text:", error);
      throw new Error("Failed to update the whole text");
    }
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
   * Clear the conversation history
   */
  clearConversation(): void {
    this.llmService.clearConversation();
  }

  async summarizeSentence(text: string): Promise<string> {
    return this.llmService.summarizeSentence(text);
  }

  async summarizeText(text: string): Promise<string> {
    return this.llmService.summarizeText(text);
  }

  async findIntent(text: string): Promise<string> {
    return this.llmService.findIntent(text);
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

  /**
   * Updates summaries and intents for all sections and subsections in the paper.
   * This function recursively traverses the paper structure and updates the summary
   * and intent of each section and subsection based on their children's content.
   */
  async updateSectionSummaries(): Promise<void> {
    try {
      const paper = await this.paperRepository.getPaper();
      const sectionsToUpdate: Array<{ id: string; content: string }> = [];

      // First, collect all sections and their content
      const collectSections = (contentArray: any[]): void => {
        for (const item of contentArray) {
          if (
            (item.type === "section" ||
              item.type === "subsection" ||
              item.type === "subsubsection") &&
            item.content
          ) {
            const content = this.paperRepository.getChildrenValues(
              item["block-id"],
              "content"
            );
            sectionsToUpdate.push({ id: item["block-id"], content });
          }

          if (Array.isArray(item.content)) {
            collectSections(item.content);
          }
        }
      };

      collectSections(paper.content);

      // Process sections in batches
      for (let i = 0; i < sectionsToUpdate.length; i += this.batchSize) {
        const batch = sectionsToUpdate.slice(i, i + this.batchSize);
        const batchPromises = batch.map(async ({ id, content }) => {
          const [summary, intent] = await Promise.all([
            this.llmService.summarizeText(content),
            this.llmService.findIntent(content),
          ]);

          await this.updateBlock(id, "summary", summary);
          await this.updateBlock(id, "intent", intent);
        });

        // Wait for all items in the batch to complete
        await Promise.all(batchPromises);
      }

      await this.savePaper(paper);
    } catch (error) {
      console.error("Error updating section summaries:", error);
      throw new Error("Failed to update section summaries");
    }
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

      // Update all blocks with their new summaries and intents
      const updateBlockFields = async (content: Content): Promise<void> => {
        if (typeof content === "string" || !("block-id" in content)) return;

        if (content.summary && content.intent && content["block-id"]) {
          await this.updateBlock(
            content["block-id"],
            "summary",
            content.summary
          );
          await this.updateBlock(content["block-id"], "intent", content.intent);
        }

        if (Array.isArray(content.content)) {
          for (const child of content.content) {
            await updateBlockFields(child);
          }
        }
      };

      await updateBlockFields(result.apiResponse.parsedResult);
      return result;
    } catch (error) {
      console.error("Error updating rendered summaries:", error);
      throw error;
    }
  }
}
