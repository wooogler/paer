import { ContentTypeSchema, Paper, ContentType, Content } from "@paer/shared";
import { PaperRepository } from "../repositories/paperRepository";
import fs from "fs/promises";
import OpenAI from "openai";
import { string } from "zod";

export class PaperService {
  private paperRepository: PaperRepository;
  private paperPath: string;
  private client: OpenAI;

  constructor(paperPath: string) {
    this.paperRepository = new PaperRepository();
    this.paperPath = paperPath;
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async getPaper(): Promise<Paper> {
    return this.paperRepository.getPaper();
  }

  async updateSentence(blockId: string, content: string): Promise<void> {
    try {
      // Get current paper data
      const paper = await this.paperRepository.getPaper();

      // Update the sentence with new content, summary, and intent
      await this.paperRepository.updateSentence(
        blockId,
        content,
        await this.summarizeSentence(content),
        await this.findIntent(content)
      );

      // Get the updated paper data after the update
      const updatedPaper = await this.paperRepository.getPaper();

      // Save the updated paper data
      await this.savePaper(updatedPaper);
    } catch (error) {
      console.error("Error updating sentence:", error);
      throw new Error("Failed to update sentence");
    }
  }

  async autoUpdateParentBlock(blockId: string, blockContent: string) {
    this.updateBlock(blockId, "summary", await this.summarizeText(blockContent));
    this.updateBlock(blockId, "intent", await this.findIntent(blockContent));
  }

  async updateWhole(content: string): Promise<void> {
    try {
      // Fetch the current paper data
      const paper = await this.paperRepository.getPaper();
  
      // Recursive function to update all sentences
      const updateContentRecursively = async (contentArray: any[]): Promise<void> => {
        for (const item of contentArray) {
          if (item.type === "sentence" && item.content) {
            // Update the sentence content, summary, and intent
            item.summary = await this.summarizeSentence(item.content);
            item.intent = await this.findIntent(item.content);
          }
  
          // If the item has nested content, recurse into it
          if (Array.isArray(item.content)) {
            await updateContentRecursively(item.content);
          }
        }
      };
  
      // Start the recursive update
      await updateContentRecursively(paper.content);
  
      // Save the updated paper back to the repository
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

  async askLLM(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: text,
          }
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  async summarizeSentence(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Extract a summary from a following sentence. Sentence: ${text}. Summary: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  async summarizeText(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Extract a summary from a following text. Text: ${text}. Summary: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
  }

  async findIntent(text: string): Promise<string> {
    try {
      const response = await this.client.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "user", 
            content: `You are a helpful peer reader for academic writing. Infer a less than 5 words intent from a following text. Is it an argument/evidence/reasoning/benefit/shortcoming/explanation/...? Text: ${text}. Intent: `,
          },
        ],
      });

      const generatedText = response.choices[0].message?.content?.trim() ?? "";
      return generatedText;
    } catch (error) {
      const errorMessage = (error as Error).message;
      console.error("Error generating text with OpenAI:", errorMessage);
      throw new Error(errorMessage);
    }
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
      if (!paragraph || typeof paragraph === 'string' || !Array.isArray(paragraph.content)) {
        return '';
      }

      const sentences = paragraph.content
        .filter((s: any) => s && typeof s !== 'string' && s.type === "sentence")
        .map((s: any) => s.content)
        .join(" ");
      
      return sentences ? `${sentences}\n\n` : '';
    };

    // Process each section
    for (const section of paper.content) {
      if (typeof section === 'string') continue;
      
      // Add section title
      latexContent += `\\section{${section.title}}\n\n`;

      // Process content based on type
      if (section.type === "section" && Array.isArray(section.content)) {
        for (const item of section.content) {
          if (typeof item === 'string') continue;

          if (item.type === "subsection") {
            // Handle subsection
            latexContent += `\\subsection{${item.title}}\n\n`;
            
            // Process paragraphs in subsection
            if (Array.isArray(item.content)) {
              for (const paragraph of item.content) {
                latexContent += processParagraph(paragraph);
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
}
