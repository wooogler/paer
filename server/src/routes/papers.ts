import { FastifyInstance } from "fastify";
import { z } from "zod";
import { PaperSchema } from "@paer/shared/schemas/paperSchema";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";
import fs from "fs";
import path from "path";
import { PaperController } from "../controllers/paperController";

// 데이터 디렉토리 찾고 생성하는 유틸리티 함수
function findOrCreateDataDir(): string {
  // data 디렉토리 경로 설정 (개발/프로덕션 환경 모두 지원)
  const possibleDataDirs = [
    path.join(__dirname, "../../data"),
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "server/dist/data"),
    path.join(process.cwd(), "server/data"),
  ];

  // 사용 가능한 데이터 디렉토리 찾기
  for (const dir of possibleDataDirs) {
    try {
      // 디렉토리가 존재하지 않으면 생성
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created data directory at: ${dir}`);
      }

      // 쓰기 권한 테스트
      const testFile = path.join(dir, ".test");
      fs.writeFileSync(testFile, "test");
      fs.unlinkSync(testFile);

      console.log(`Using data directory: ${dir}`);
      return dir;
    } catch (error) {
      console.warn(`Cannot use directory ${dir}: ${(error as Error).message}`);
    }
  }

  throw new Error("Could not find or create a writable data directory!");
}

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

  return plotPatterns.some((pattern) => pattern.test(line.trim()));
}

function isLatexComment(line: string): boolean {
  return line.trim().startsWith("%");
}

function isLatexCommand(line: string): boolean {
  // Remove any LaTeX comments from the line first
  const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();
  
  // If the line is empty after removing comments, it's not a command
  if (!lineWithoutComments) return false;

  // If the line contains \item or \citet, it's not a command (it's content)
  if (lineWithoutComments.includes("\\item") || lineWithoutComments.includes("\\citet")) return false;
  
  // More general pattern to catch LaTeX commands
  return /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?/.test(lineWithoutComments) ||
         // Catch margin and layout settings
         /^[a-zA-Z]+(?:top|bottom|left|right|inner|outer)margin=\d+pt(?:,)?$/.test(lineWithoutComments) ||
         // Catch other common layout parameters
         /^[a-zA-Z]+(?:width|height|depth|size)=\d+pt(?:,)?$/.test(lineWithoutComments) ||
         // Catch spacing parameters
         /^[a-zA-Z]+(?:space|skip|vspace|hspace)=\d+pt(?:,)?$/.test(lineWithoutComments) ||
         // Catch color and style settings
         /^[a-zA-Z]+(?:color|style|background|linecolor|frametitlebackgroundcolor)=[a-zA-Z]+(?:!?\d+)?(?:,)?$/.test(lineWithoutComments) ||
         // Catch frame and title settings
         /^[a-zA-Z]+(?:frame|title|frametitle)=[^,]+(?:,)?$/.test(lineWithoutComments) ||
         // Catch conference and date settings
         /^[a-zA-Z]+(?:conference|date|year|month|day)=[^,]+(?:,)?$/.test(lineWithoutComments) ||
         // Catch ACM-specific settings
         /^\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(lineWithoutComments) ||
         // Catch color definitions
         /^\\definecolor{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
         // Catch any line that's just a LaTeX command with optional arguments
         /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?(?:\s*%)?$/.test(lineWithoutComments) ||
         // Catch any line that contains an ACM command anywhere
         /\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(lineWithoutComments) ||
         // Catch multi-line ACM conference settings
         /^\\acmConference\[.*?\]{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
         /^\\acmBooktitle{.*?}$/.test(lineWithoutComments) ||
         // Catch frametitlefont and similar settings
         /^frametitlefont=.*$/.test(lineWithoutComments) ||
         // Catch any line that's part of a LaTeX environment definition
         /^\\newenvironment{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
         // Catch any line that's part of a LaTeX command definition
         /^\\newcommand{.*?}{.*?}$/.test(lineWithoutComments) ||
         // Catch environment begin/end markers (but not their content)
         /^\\begin{(?!itemize).*?}$/.test(lineWithoutComments) ||
         /^\\end{(?!itemize).*?}$/.test(lineWithoutComments) ||
         // Catch any line that's a LaTeX setting with optional arguments
         /^[a-zA-Z]+(?:\[.*?\])?=.*$/.test(lineWithoutComments) ||
         // Catch any line that's part of a LaTeX environment options
         /^\[.*?\]$/.test(lineWithoutComments) ||
         // Catch any line that's a LaTeX setting with a value
         /^[a-zA-Z]+=.*$/.test(lineWithoutComments);
}

function isNonPaperContent(line: string): boolean {
  // Remove any LaTeX comments from the line first
  const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();

  // If the line is empty after removing comments, it's not non-paper content
  if (!lineWithoutComments) return false;

  const nonPaperPatterns = [
    // Conference and submission info
    /^Submitted to/i,
    /^In proceedings of/i,
    /^To appear in/i,
    /^Conference:/i,
    /^Workshop:/i,
    /^Symposium:/i,
    /^Draft of/i,
    /^Preprint/i,
    /^Camera-ready/i,
    /^Under review/i,
    /^Accepted to/i,
    /^\\acmConference/i,
    /^\\acmJournal/i,
    /^\\acmVolume/i,
    /^\\acmNumber/i,
    /^\\acmPrice/i,
    /^\\acmDOI/i,
    /^\\acmISBN/i,
    /^\\acmISSN/i,
    /^\\acmSubmissionID/i,
    /^\\acmArticle/i,
    /^\\acmYear/i,
    /^\\acmMonth/i,
    /^\\acmDay/i,
    /^\\acmDate/i,
    /^\\acmLocation/i,
    /^\\acmCity/i,
    /^\\acmCountry/i,
    /^\\acmState/i,
    /^\\acmRegion/i,
    /^\\acmCategory/i,
    /^\\acmSubject/i,
    /^\\acmKeywords/i,
    /^\\acmTerms/i,
    /^\\acmFormat/i,
    /^\\acmStyle/i,
    /^\\acmTemplate/i,
    /^\\acmCopyright/i,
    /^\\acmPermission/i,
    /^\\acmNotice/i,
    /^\\acmReference/i,
    /^\\acmAbstract/i,
    /^\\acmAcknowledgments/i,
    /^\\acmBibliography/i,
    /^\\acmAppendix/i,
    /^\\acmBooktitle/i,

    // Author information
    /^Email:/i,
    /^Address:/i,
    /^Affiliation:/i,
    /^Department of/i,
    /^University of/i,
    /^School of/i,
    /^Institute of/i,
    /^Contact:/i,
    /^Corresponding author:/i,

    // Document metadata
    /^Keywords:/i,
    /^Categories and Subject Descriptors:/i,
    /^General Terms:/i,
    /^Copyright notice:/i,
    /^Permission to make digital or hard copies/i,
    /^ACM Reference format:/i,
    /^IEEE Reference format:/i,
    /^DOI:/i,
    /^ISBN:/i,
    /^ISSN:/i,

    // Front matter
    /^Abstract:/i,
    /^Table of Contents/i,
    /^List of Figures/i,
    /^List of Tables/i,
    /^Acknowledgments?:/i,
    /^References:/i,
    /^Bibliography:/i,
    /^Appendix:/i,

    // Empty or separator lines
    /^[-=_*]{3,}$/, // Lines with 3 or more repeated separator characters
    /^\s*$/, // Empty lines or lines with only whitespace

    // JSON-like content and configuration values
    /^"[a-zA-Z_]+":\s*"[0-9]+"$/, // Matches "key": "value" pattern
    /^"[a-zA-Z_]+":\s*[0-9]+$/, // Matches "key": value pattern
    /^"[a-zA-Z_]+":\s*"[0-9]+",$/, // Matches "key": "value", pattern
    /^"[a-zA-Z_]+":\s*[0-9]+,$/, // Matches "key": value, pattern

    // LaTeX comments and settings
    /^%.*$/, // Any line that starts with %
    /^\\setcopyright{.*}$/, // Copyright settings
    /^\\acmSetup{.*}$/, // ACM setup commands
    /^\\acmSubmissionID{.*}$/, // Submission ID
    /^\\acmPrice{.*}$/, // Price settings
    /^\\acmDOI{.*}$/, // DOI settings
    /^\\acmISBN{.*}$/, // ISBN settings
    /^\\acmISSN{.*}$/, // ISSN settings
    /^\\acmArticle{.*}$/, // Article settings
    /^\\acmYear{.*}$/, // Year settings
    /^\\acmMonth{.*}$/, // Month settings
    /^\\acmDay{.*}$/, // Day settings
    /^\\acmDate{.*}$/, // Date settings
    /^\\acmLocation{.*}$/, // Location settings
    /^\\acmCity{.*}$/, // City settings
    /^\\acmCountry{.*}$/, // Country settings
    /^\\acmState{.*}$/, // State settings
    /^\\acmRegion{.*}$/, // Region settings
    /^\\acmCategory{.*}$/, // Category settings
    /^\\acmSubject{.*}$/, // Subject settings
    /^\\acmKeywords{.*}$/, // Keywords settings
    /^\\acmTerms{.*}$/, // Terms settings
    /^\\acmFormat{.*}$/, // Format settings
    /^\\acmStyle{.*}$/, // Style settings
    /^\\acmTemplate{.*}$/, // Template settings
    /^\\acmCopyright{.*}$/, // Copyright settings
    /^\\acmPermission{.*}$/, // Permission settings
    /^\\acmNotice{.*}$/, // Notice settings
    /^\\acmReference{.*}$/, // Reference settings
    /^\\acmAbstract{.*}$/, // Abstract settings
    /^\\acmAcknowledgments{.*}$/, // Acknowledgments settings
    /^\\acmBibliography{.*}$/, // Bibliography settings
    /^\\acmAppendix{.*}$/, // Appendix settings

    // Color definitions and settings
    /^\\definecolor{.*?}{.*?}{.*?}$/, // Color definitions
    /^\\color{.*?}$/, // Color settings
    /^\\textcolor{.*?}{.*?}$/, // Text color settings
    /^\\pagecolor{.*?}$/, // Page color settings
    /^\\colorbox{.*?}{.*?}$/, // Color box settings
    /^\\fcolorbox{.*?}{.*?}{.*?}$/, // Framed color box settings

    // Any line containing ACM conference information
    /\\acmConference{.*?}/, // ACM conference settings
    /\\acmJournal{.*?}/, // ACM journal settings
    /\\acmVolume{.*?}/, // ACM volume settings
    /\\acmNumber{.*?}/, // ACM number settings
    /\\acmPrice{.*?}/, // ACM price settings
    /\\acmDOI{.*?}/, // ACM DOI settings
    /\\acmISBN{.*?}/, // ACM ISBN settings
    /\\acmISSN{.*?}/, // ACM ISSN settings
    /\\acmSubmissionID{.*?}/, // ACM submission ID settings
    /\\acmArticle{.*?}/, // ACM article settings
    /\\acmYear{.*?}/, // ACM year settings
    /\\acmMonth{.*?}/, // ACM month settings
    /\\acmDay{.*?}/, // ACM day settings
    /\\acmDate{.*?}/, // ACM date settings
    /\\acmLocation{.*?}/, // ACM location settings
    /\\acmCity{.*?}/, // ACM city settings
    /\\acmCountry{.*?}/, // ACM country settings
    /\\acmState{.*?}/, // ACM state settings
    /\\acmRegion{.*?}/, // ACM region settings
    /\\acmCategory{.*?}/, // ACM category settings
    /\\acmSubject{.*?}/, // ACM subject settings
    /\\acmKeywords{.*?}/, // ACM keywords settings
    /\\acmTerms{.*?}/, // ACM terms settings
    /\\acmFormat{.*?}/, // ACM format settings
    /\\acmStyle{.*?}/, // ACM style settings
    /\\acmTemplate{.*?}/, // ACM template settings
    /\\acmCopyright{.*?}/, // ACM copyright settings
    /\\acmPermission{.*?}/, // ACM permission settings
    /\\acmNotice{.*?}/, // ACM notice settings
    /\\acmReference{.*?}/, // ACM reference settings
    /\\acmAbstract{.*?}/, // ACM abstract settings
    /\\acmAcknowledgments{.*?}/, // ACM acknowledgments settings
    /\\acmBibliography{.*?}/, // ACM bibliography settings
    /\\acmAppendix{.*?}/, // ACM appendix settings
    /\\acmBooktitle{.*?}/, // ACM booktitle settings
  ];

  return nonPaperPatterns.some((pattern) => pattern.test(lineWithoutComments));
}

function detectFileType(content: string): "latex" | "markdown" | "text" {
  // Check for LaTeX indicators
  if (
    content.includes("\\documentclass") ||
    content.includes("\\begin{document}")
  ) {
    return "latex";
  }

  // Check for Markdown indicators
  if (
    content.includes("# ") ||
    content.includes("## ") ||
    content.includes("### ")
  ) {
    return "markdown";
  }

  // Default to text
  return "text";
}

function extractTitle(
  content: string,
  fileType: "latex" | "markdown" | "text"
): string {
  switch (fileType) {
    case "latex":
      const latexTitle = content.match(/\\title{(.*?)}/);
      return latexTitle ? latexTitle[1] : "Untitled Paper";
    case "markdown":
      const markdownTitle = content.match(/^#\s+(.+)$/m);
      return markdownTitle ? markdownTitle[1] : "Untitled Paper";
    case "text":
      // For plain text, use the first non-empty line
      const firstLine = content.split("\n").find((line) => line.trim());
      return firstLine ? firstLine.trim() : "Untitled Paper";
  }
}

export function processLatexContent(
  content: string,
  baseTimestamp: number
): any[] {
  const fileType = detectFileType(content);
  const lines = content.split("\n");
  const result: any[] = [];
  let currentParagraph: any[] = [];
  let currentSection: any = null;
  let currentSubsection: any = null;
  let blockIdIncrement = 0;

  // Helper function to create a sentence block
  const createSentenceBlock = (content: string): any => ({
    "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
    summary: "",
    intent: "",
    type: "sentence",
    content: content,
  });

  // Helper function to create a paragraph block
  const createParagraphBlock = (sentences: any[]): any => ({
    "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
    summary: "",
    intent: "",
    type: "paragraph",
    content: sentences,
  });

  // Helper function to save current section if it has content
  const saveCurrentSection = () => {
    if (currentSection) {
      if (currentSubsection && currentSubsection.content.length > 0) {
        currentSection.content.push(currentSubsection);
      }
      if (currentSection.content.length > 0) {
        result.push(currentSection);
      }
      currentSubsection = null;
    }
  };

  // Helper function to save current subsection if it has content
  const saveCurrentSubsection = () => {
    if (
      currentSubsection &&
      currentSection &&
      currentSubsection.content.length > 0
    ) {
      currentSection.content.push(currentSubsection);
      currentSubsection = null;
    }
  };

  // Helper function to create a section block
  const createSectionBlock = (title: string, subsections: any[]): any => ({
    title: title,
    "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
    summary: "",
    intent: "",
    type: "section",
    content: subsections,
  });

  // Helper function to create a subsection block
  const createSubsectionBlock = (title: string, paragraphs: any[]): any => ({
    title: title,
    "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
    summary: "",
    intent: "",
    type: "subsection",
    content: paragraphs,
  });

  // Helper function to clean LaTeX content
  const cleanLatexContent = (line: string): string => {
    // First check if the entire line is a comment
    if (line.trim().startsWith("%")) {
      return "";
    }

    // Remove any inline comments but keep the content before them
    const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();

    // Skip if empty after removing comments
    if (!lineWithoutComments) return "";

    // Skip if it's a LaTeX command or non-paper content
    if (isLatexCommand(lineWithoutComments) || isNonPaperContent(lineWithoutComments)) {
      return "";
    }

    // Skip if the line contains ACM conference information
    if (lineWithoutComments.includes("\\acmConference") ||
        lineWithoutComments.includes("\\acmBooktitle") ||
        lineWithoutComments.includes("conference title from your rights confirmation emai") ||
        lineWithoutComments.includes("Woodstock") ||
        lineWithoutComments.includes("June 03--05")) {
      return "";
    }

    // Clean up the line by removing LaTeX commands but keep the content
    let cleanedLine = lineWithoutComments;

    // If the line contains citations, handle them first
    if (lineWithoutComments.includes("\\citet") || lineWithoutComments.includes("\\cite")) {
      // First replace citations with [citation] format
      cleanedLine = lineWithoutComments
        .replace(/\\citet{(.*?)}/g, (match, citation) => `[${citation}]`)  // Replace citet citations with [citation]
        .replace(/\\cite{(.*?)}/g, (match, citation) => `[${citation}]`)  // Replace regular citations with [citation]
        .replace(/\[@(.*?)\]/g, (match, citation) => `[${citation}]`)    // Replace markdown citations with [citation]
        .replace(/\\textbf{(.*?)}/g, "$1")  // Remove textbf formatting
        .replace(/\\textit{(.*?)}/g, "$1")  // Remove textit formatting
        .replace(/\\emph{(.*?)}/g, "$1")    // Remove emph formatting
        .replace(/\\label{.*?}/g, "")       // Remove labels
        .replace(/\\ref{.*?}/g, "")         // Remove refs
        .replace(/\{.*?\}/g, "")      // Remove curly braces and their content
        .replace(/\[.*?\]/g, "")      // Remove square brackets and their content
        .trim();
    } else {
      // For non-citation lines, clean up LaTeX commands
      cleanedLine = lineWithoutComments
        .replace(/\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?/g, "")  // Remove all LaTeX commands
        .replace(/\\textbf{(.*?)}/g, "$1")  // Remove textbf formatting
        .replace(/\\textit{(.*?)}/g, "$1")  // Remove textit formatting
        .replace(/\\emph{(.*?)}/g, "$1")    // Remove emph formatting
        .replace(/\\label{.*?}/g, "")       // Remove labels
        .replace(/\\ref{.*?}/g, "")         // Remove refs
        .replace(/\\newcommand{.*?}{.*?}/g, "")  // Remove newcommand definitions
        .replace(/\\newenvironment{.*?}{.*?}{.*?}/g, "")  // Remove newenvironment definitions
        .replace(/\\acmConference{.*?}/g, "")  // Remove ACM conference settings
        .replace(/\\acmJournal{.*?}/g, "")  // Remove ACM journal settings
        .replace(/\\acmVolume{.*?}/g, "")  // Remove ACM volume settings
        .replace(/\\acmNumber{.*?}/g, "")  // Remove ACM number settings
        .replace(/\\acmPrice{.*?}/g, "")  // Remove ACM price settings
        .replace(/\\acmDOI{.*?}/g, "")  // Remove ACM DOI settings
        .replace(/\\acmISBN{.*?}/g, "")  // Remove ACM ISBN settings
        .replace(/\\acmISSN{.*?}/g, "")  // Remove ACM ISSN settings
        .replace(/\\acmSubmissionID{.*?}/g, "")  // Remove ACM submission ID settings
        .replace(/\\acmArticle{.*?}/g, "")  // Remove ACM article settings
        .replace(/\\acmYear{.*?}/g, "")  // Remove ACM year settings
        .replace(/\\acmMonth{.*?}/g, "")  // Remove ACM month settings
        .replace(/\\acmDay{.*?}/g, "")  // Remove ACM day settings
        .replace(/\\acmDate{.*?}/g, "")  // Remove ACM date settings
        .replace(/\\acmLocation{.*?}/g, "")  // Remove ACM location settings
        .replace(/\\acmCity{.*?}/g, "")  // Remove ACM city settings
        .replace(/\\acmCountry{.*?}/g, "")  // Remove ACM country settings
        .replace(/\\acmState{.*?}/g, "")  // Remove ACM state settings
        .replace(/\\acmRegion{.*?}/g, "")  // Remove ACM region settings
        .replace(/\\acmCategory{.*?}/g, "")  // Remove ACM category settings
        .replace(/\\acmSubject{.*?}/g, "")  // Remove ACM subject settings
        .replace(/\\acmKeywords{.*?}/g, "")  // Remove ACM keywords settings
        .replace(/\\acmTerms{.*?}/g, "")  // Remove ACM terms settings
        .replace(/\\acmFormat{.*?}/g, "")  // Remove ACM format settings
        .replace(/\\acmStyle{.*?}/g, "")  // Remove ACM style settings
        .replace(/\\acmTemplate{.*?}/g, "")  // Remove ACM template settings
        .replace(/\\acmCopyright{.*?}/g, "")  // Remove ACM copyright settings
        .replace(/\\acmPermission{.*?}/g, "")  // Remove ACM permission settings
        .replace(/\\acmNotice{.*?}/g, "")  // Remove ACM notice settings
        .replace(/\\acmReference{.*?}/g, "")  // Remove ACM reference settings
        .replace(/\\acmAbstract{.*?}/g, "")  // Remove ACM abstract settings
        .replace(/\\acmAcknowledgments{.*?}/g, "")  // Remove ACM acknowledgments settings
        .replace(/\\acmBibliography{.*?}/g, "")  // Remove ACM bibliography settings
        .replace(/\\acmAppendix{.*?}/g, "")  // Remove ACM appendix settings
        .replace(/\\acmBooktitle{.*?}/g, "")  // Remove ACM booktitle settings
        .replace(/\\begin{itemize}/g, "")  // Remove itemize begin
        .replace(/\\end{itemize}/g, "")    // Remove itemize end
        .replace(/\\item\s*/g, "• ")       // Replace \item with bullet point
        .replace(/\{.*?\}/g, "")  // Remove any remaining curly braces and their content
        .replace(/\[.*?\]/g, "")  // Remove any remaining square brackets and their content
        .trim();
    }

    // If the line contains itemize content, preserve it
    if (lineWithoutComments.includes("\\item")) {
      cleanedLine = lineWithoutComments
        .replace(/\\item\s*/g, "• ")  // Replace \item with bullet point
        .replace(/\{.*?\}/g, "")      // Remove curly braces and their content
        .replace(/\[.*?\]/g, "")      // Remove square brackets and their content
        .trim();
    }

    return cleanedLine;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip empty lines
    if (!trimmedLine) {
      // If we have a current paragraph, save it
      if (currentParagraph && currentParagraph.length > 0) {
        const paragraph = createParagraphBlock(currentParagraph);
        if (currentSubsection) {
          currentSubsection.content.push(paragraph);
        } else {
          currentSection.content.push(paragraph);
        }
        currentParagraph = [];
      }
      continue;
    }

    // Handle section headers
    if (fileType === "latex") {
      // Handle section headers with optional short title
      if (trimmedLine.includes("\\section[")) {
        const match = trimmedLine.match(/\\section\[(.*?)\]\{(.*?)\}/);
        if (match) {
          saveCurrentSection();
          const title = match[2];
          currentSection = createSectionBlock(title, []);
          currentSubsection = null;
          currentParagraph = [];
        }
      }
      // Handle regular section headers
      else if (trimmedLine.includes("\\section{")) {
        const title = trimmedLine.match(/\\section{(.*?)}/)?.[1] || "Untitled Section";
        saveCurrentSection();
        currentSection = createSectionBlock(title, []);
        currentSubsection = null;
        currentParagraph = [];
      }
      // Handle subsection headers with optional short title
      else if (trimmedLine.includes("\\subsection[")) {
        const match = trimmedLine.match(/\\subsection\[(.*?)\]\{(.*?)\}/);
        if (match) {
          saveCurrentSubsection();
          const title = match[2];
          currentSubsection = createSubsectionBlock(title, []);
          currentParagraph = [];
        }
      }
      // Handle regular subsection headers
      else if (trimmedLine.includes("\\subsection{")) {
        const title = trimmedLine.match(/\\subsection{(.*?)}/)?.[1] || "Untitled Subsection";
        saveCurrentSubsection();
        currentSubsection = createSubsectionBlock(title, []);
        currentParagraph = [];
      }
      // Handle regular content
      else {
        // Create default section if none exists
        if (!currentSection) {
          currentSection = createSectionBlock("Main Content", []);
        }

        // Clean and process the line
        const cleanedLine = cleanLatexContent(trimmedLine);

        // Only process if we have content after cleaning
        if (cleanedLine) {
          // Split into sentences
          const sentences = cleanedLine
            .split(/(?<=[.!?])\s+/)
            .filter(sentence => {
              const cleaned = sentence.trim();
              return cleaned.length > 0 && 
                     cleaned.length >= 10 &&  // Minimum sentence length
                     /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
                     !/^[^a-zA-Z]*$/.test(cleaned); // Must not be only special characters
            })
            .map(sentence => createSentenceBlock(sentence.trim()));

          // If we have valid sentences, add them to the current paragraph
          if (sentences.length > 0) {
            currentParagraph = currentParagraph.concat(sentences);
          }
        }
      }
    }
    // Handle markdown section headers
    else if (fileType === "markdown") {
      if (trimmedLine.startsWith("## ")) {
        saveCurrentSection();
        const title = trimmedLine.replace("## ", "").trim();
        currentSection = createSectionBlock(title, []);
        currentSubsection = null;
        currentParagraph = [];
      } else if (trimmedLine.startsWith("### ")) {
        saveCurrentSubsection();
        const title = trimmedLine.replace("### ", "").trim();
        currentSubsection = createSubsectionBlock(title, []);
        currentParagraph = [];
      }
      // Handle markdown content
      else {
        // Create default section if none exists
        if (!currentSection) {
          currentSection = createSectionBlock("Main Content", []);
        }

        // Split into sentences
        const sentences = trimmedLine
          .split(/(?<=[.!?])\s+/)
          .filter((sentence) => {
            const cleaned = sentence.trim();
            return (
              cleaned.length > 0 &&
              cleaned.length >= 10 && // Minimum sentence length
              /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
              !/^[^a-zA-Z]*$/.test(cleaned)
            ); // Must not be only special characters
          })
          .map((sentence) => createSentenceBlock(sentence.trim()));

        // If we have valid sentences, create a paragraph
        if (sentences.length > 0) {
          currentParagraph = sentences;
          const paragraph = createParagraphBlock(currentParagraph);

          // 만약 subsection이 존재하면 subsection에 추가, 없으면 section에 직접 추가
          if (currentSubsection) {
            currentSubsection.content.push(paragraph);
          } else {
            currentSection.content.push(paragraph);
          }
        }
      }
    }
    // Handle plain text content
    else {
      // Create default section if none exists
      if (!currentSection) {
        currentSection = createSectionBlock("Main Content", []);
      }

      // Split into sentences
      const sentences = trimmedLine
        .split(/(?<=[.!?])\s+/)
        .filter((sentence) => {
          const cleaned = sentence.trim();
          return (
            cleaned.length > 0 &&
            cleaned.length >= 10 && // Minimum sentence length
            /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
            !/^[^a-zA-Z]*$/.test(cleaned)
          ); // Must not be only special characters
        })
        .map((sentence) => createSentenceBlock(sentence.trim()));

      // If we have valid sentences, create a paragraph
      if (sentences.length > 0) {
        currentParagraph = sentences;
        const paragraph = createParagraphBlock(currentParagraph);

        // 만약 subsection이 존재하면 subsection에 추가, 없으면 section에 직접 추가
        if (currentSubsection) {
          currentSubsection.content.push(paragraph);
        } else {
          currentSection.content.push(paragraph);
        }
      }
    }
  }

  // Save the last section and subsection
  saveCurrentSection();

  return result;
}

export default async function paperRoutes(fastify: FastifyInstance) {
  const paperController = new PaperController();
  // Test endpoint to process our test paper
  fastify.get("/test", async (request, reply) => {
    try {
      const content = fs.readFileSync(
        path.join(__dirname, "../../data/main.tex"),
        "utf-8"
      );

      const baseTimestamp = Math.floor(Date.now() / 1000);
      const processedContent = processLatexContent(content, baseTimestamp);

      const paper = {
        title: extractTitle(content, "latex"),
        "block-id": baseTimestamp.toString(),
        summary: "",
        intent: "",
        type: ContentTypeSchemaEnum.Paper,
        content: processedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      const validatedPaper = PaperSchema.parse(paper);

      // Write the output to a file for inspection
      fs.writeFileSync(
        path.join(__dirname, "../../data/processed_paper.json"),
        JSON.stringify(validatedPaper, null, 2)
      );

      return { success: true, message: "Test paper processed successfully" };
    } catch (error) {
      console.error("Error processing test paper:", error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  });

  // Process paper content
  fastify.post<{
    Body: { content: string };
  }>("/process", async (request, reply) => {
    try {
      const { content } = request.body;
      const fileType = detectFileType(content);
      const baseTimestamp = Math.floor(Date.now() / 1000);
      const processedContent = processLatexContent(content, baseTimestamp);

      // Create the paper object
      const paper = {
        title: extractTitle(content, fileType),
        "block-id": baseTimestamp.toString(),
        summary: "",
        intent: "",
        type: ContentTypeSchemaEnum.Paper,
        content: processedContent,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
      };

      // 데이터 디렉토리 찾기
      const dataDir = findOrCreateDataDir();
      const paperJsonPath = path.join(dataDir, "paper.json");
      fs.writeFileSync(paperJsonPath, JSON.stringify(paper, null, 2));
      console.log(`Saved processed paper to: ${paperJsonPath}`);

      // 처리된 paper 객체를 직접 반환
      return reply.send(paper);
    } catch (error) {
      console.error("Error processing paper:", error);
      reply.status(500).send({ error: "Failed to process paper" });
    }
  });

  // Save paper
  fastify.post<{
    Body: any;
  }>("/", async (request, reply) => {
    try {
      const paper = request.body;

      // 데이터 디렉토리 찾기
      const dataDir = findOrCreateDataDir();
      const paperJsonPath = path.join(dataDir, "paper.json");
      fs.writeFileSync(paperJsonPath, JSON.stringify(paper, null, 2));
      console.log(`Saved paper to: ${paperJsonPath}`);

      return { success: true };
    } catch (error) {
      console.error("Error saving paper:", error);
      reply.status(500).send({ error: "Failed to save paper" });
    }
  });
}
