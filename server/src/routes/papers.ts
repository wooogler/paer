import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PaperSchema } from '@paer/shared/schemas/paperSchema';
import { ContentTypeSchemaEnum } from '@paer/shared/schemas/contentSchema';
import fs from 'fs';
import path from 'path';

function generateBlockId(baseTimestamp: number, increment: number): string {
  return `${baseTimestamp + increment}`;
}

function isPlotOrFigure(line: string): boolean {
  // Common patterns for plots/figures in LaTeX and markdown
  const plotPatterns = [
    /^!\[.*?\]\(.*?\)/, // Markdown images
    /^<img.*?>/, // HTML images
    /^```.*?(plot|figure|graph|chart).*?```/, // Code blocks with plot/figure keywords
    /^<figure>/, // HTML figure tags
    /^<div.*?class=".*?(plot|figure|graph|chart).*?">/, // Divs with plot/figure classes
    /\\begin{figure}/, // LaTeX figure environment
    /\\begin{figure\*}/, // LaTeX figure* environment
    /\\includegraphics/, // LaTeX image inclusion
    /\\begin{verbatim}/, // LaTeX verbatim blocks
    /\\begin{lstlisting}/, // LaTeX listing blocks
    /\\begin{minted}/, // LaTeX minted blocks
    /\\begin{frame}/, // LaTeX frame blocks
    /\\begin{center}/, // LaTeX center blocks
    /\\begin{table}/, // LaTeX table environment
    /\\begin{tabular}/, // LaTeX tabular environment
  ];
  
  return plotPatterns.some(pattern => pattern.test(line.trim()));
}

function isLatexComment(line: string): boolean {
  return line.trim().startsWith('%');
}

function isLatexCommand(line: string): boolean {
  return line.trim().startsWith('\\');
}

function extractLatexTitle(content: string): string {
  const titleMatch = content.match(/\\title{(.*?)}/);
  return titleMatch ? titleMatch[1] : 'Untitled Paper';
}

export function processLatexContent(content: string, baseTimestamp: number): any[] {
  const lines = content.split('\n');
  const result: any[] = [];
  let currentParagraph: any[] = [];
  let currentSection: any = null;
  let sectionIndex = 0;
  let subsectionIndex = 0;
  let paragraphIndex = 0;
  let blockIdIncrement = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || isPlotOrFigure(trimmedLine) || isLatexComment(trimmedLine)) continue;

    // Handle section headers (both Markdown and LaTeX)
    if (trimmedLine.startsWith('\\section{') || trimmedLine.startsWith('## ')) {
      const title = trimmedLine.startsWith('\\section{') 
        ? trimmedLine.match(/\\section{(.*?)}/)?.[1] || 'Untitled Section'
        : trimmedLine.replace('## ', '').trim();
      const blockId = generateBlockId(baseTimestamp, blockIdIncrement++);

      if (currentSection) {
        result.push(currentSection);
      }
      currentSection = {
        title,
        "block-id": blockId,
        summary: "",
        intent: "",
        type: ContentTypeSchemaEnum.Section,
        content: []
      };
      sectionIndex++;
    } else if (trimmedLine.startsWith('\\subsection{') || trimmedLine.startsWith('### ')) {
      const title = trimmedLine.startsWith('\\subsection{')
        ? trimmedLine.match(/\\subsection{(.*?)}/)?.[1] || 'Untitled Subsection'
        : trimmedLine.replace('### ', '').trim();
      const subsection = {
        title,
        "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
        summary: "",
        intent: "",
        type: ContentTypeSchemaEnum.Subsection,
        content: []
      };
      if (currentSection) {
        currentSection.content.push(subsection);
      }
      subsectionIndex++;
    } else if (!trimmedLine.startsWith('\\')) { // Only process non-LaTeX command lines
      // Regular content
      if (currentSection) {
        // Add to current section's content
        if (currentSection.content.length === 0 || 
            currentSection.content[currentSection.content.length - 1].type === ContentTypeSchemaEnum.Subsection) {
          // Start new paragraph
          currentParagraph = [];
          paragraphIndex++;
        }

        // Split the line into sentences (handle common sentence endings)
        // This regex handles various sentence endings including periods, exclamation marks, question marks
        // and handles common abbreviations like Dr., Mr., Mrs., etc.
        const sentences = trimmedLine
          .replace(/([.!?])\s+/g, '$1|') // Replace sentence endings with a delimiter
          .split('|') // Split on the delimiter
          .map(s => s.trim())
          .filter(s => s.length > 0);
        
        for (const sentenceText of sentences) {
          const sentence = {
            "block-id": generateBlockId(
              baseTimestamp,
              blockIdIncrement++
            ),
            summary: "",
            intent: "",
            type: ContentTypeSchemaEnum.Sentence,
            content: sentenceText.trim()
          };

          currentParagraph.push(sentence);
        }

        // Create a paragraph block for the collected sentences
        const paragraph = {
          "block-id": generateBlockId(
            baseTimestamp,
            blockIdIncrement++
          ),
          summary: "",
          intent: "",
          type: ContentTypeSchemaEnum.Paragraph,
          content: currentParagraph
        };

        if (currentSection.content.length > 0 && 
            currentSection.content[currentSection.content.length - 1].type === ContentTypeSchemaEnum.Subsection) {
          currentSection.content[currentSection.content.length - 1].content.push(paragraph);
        } else {
          currentSection.content.push(paragraph);
        }
        currentParagraph = [];
      }
    }
  }

  // Add the last section if exists
  if (currentSection) {
    result.push(currentSection);
  }

  return result;
}

export default async function paperRoutes(fastify: FastifyInstance) {
  // Test endpoint to process our test paper
  fastify.get('/test', async (request, reply) => {
    try {
      const content = fs.readFileSync(
        path.join(__dirname, '../../data/main.tex'),
        'utf-8'
      );
      
      const baseTimestamp = Math.floor(Date.now() / 1000);
      const processedContent = processLatexContent(content, baseTimestamp);

      const paper = {
        title: extractLatexTitle(content),
        "block-id": baseTimestamp.toString(),
        summary: "",
        intent: "",
        type: ContentTypeSchemaEnum.Paper,
        content: processedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      };

      const validatedPaper = PaperSchema.parse(paper);
      
      // Write the output to a file for inspection
      fs.writeFileSync(
        path.join(__dirname, '../../data/processed_paper.json'),
        JSON.stringify(validatedPaper, null, 2)
      );

      return { success: true, message: 'Test paper processed successfully' };
    } catch (error) {
      console.error('Error processing test paper:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  });

  // Process paper content
  fastify.post('/process', async (request, reply) => {
    const { content } = request.body as { content: string };
    
    const baseTimestamp = Math.floor(Date.now() / 1000);
    const processedContent = processLatexContent(content, baseTimestamp);

    const paper = {
      title: extractLatexTitle(content),
      "block-id": baseTimestamp.toString(),
      summary: "",
      intent: "",
      type: ContentTypeSchemaEnum.Paper,
      content: processedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    const validatedPaper = PaperSchema.parse(paper);
    return validatedPaper;
  });

  // Save paper
  fastify.post('/', async (request, reply) => {
    const paper = PaperSchema.parse(request.body);
    
    // Here you would typically save the paper to your database
    // For now, we'll just return success
    return { success: true };
  });
} 