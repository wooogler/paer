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
  if (
    lineWithoutComments.includes("\\item") ||
    lineWithoutComments.includes("\\citet")
  )
    return false;

  // Don't treat abstract environment markers as commands
  if (
    lineWithoutComments === "\\begin{abstract}" ||
    lineWithoutComments === "\\end{abstract}"
  )
    return false;

  // More generalized filter for XML tags that shouldn't be in the paper text
  if (/^<\/?[a-zA-Z0-9_]+>/.test(lineWithoutComments)) {
    return true;
  }

  // More general pattern to catch LaTeX commands
  return (
    /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?/.test(lineWithoutComments) ||
    // Classification commands
    /^\\ccsdesc/.test(lineWithoutComments) ||
    /^\\begin{CCSXML}/.test(lineWithoutComments) ||
    /^\\end{CCSXML}/.test(lineWithoutComments) ||
    // Catch margin and layout settings
    /^[a-zA-Z]+(?:top|bottom|left|right|inner|outer)margin=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch other common layout parameters
    /^[a-zA-Z]+(?:width|height|depth|size)=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch spacing parameters
    /^[a-zA-Z]+(?:space|skip|vspace|hspace)=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch color and style settings
    /^[a-zA-Z]+(?:color|style|background|linecolor|frametitlebackgroundcolor)=[a-zA-Z]+(?:!?\d+)?(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch frame and title settings
    /^[a-zA-Z]+(?:frame|title|frametitle)=[^,]+(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch conference and date settings
    /^[a-zA-Z]+(?:conference|date|year|month|day)=[^,]+(?:,)?$/.test(
      lineWithoutComments
    ) ||
    // Catch ACM-specific settings
    /^\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(
      lineWithoutComments
    ) ||
    // Catch color definitions
    /^\\definecolor{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
    // Catch any line that's just a LaTeX command with optional arguments
    /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?(?:\s*%)?$/.test(lineWithoutComments) ||
    // Catch any line that contains an ACM command anywhere
    /\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(
      lineWithoutComments
    ) ||
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
    /^[a-zA-Z]+=.*$/.test(lineWithoutComments)
  );
}

function isNonPaperContent(line: string): boolean {
  // Remove any LaTeX comments from the line first
  const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();

  // If the line is empty after removing comments, it's not non-paper content
  if (!lineWithoutComments) return false;

  // Don't treat abstract environment markers as non-paper content
  if (
    lineWithoutComments === "\\begin{abstract}" ||
    lineWithoutComments === "\\end{abstract}"
  )
    return false;

  // General pattern for XML tags and LaTeX classification/metadata commands
  if (
    // Any XML tag
    /^<\/?[a-zA-Z0-9_]+>/.test(lineWithoutComments) ||
    // Any CCS or classification description
    /^\\ccsdesc/.test(lineWithoutComments) ||
    // Any ACM command
    /^\\acm[A-Z][a-zA-Z]*/i.test(lineWithoutComments)
  ) {
    return true;
  }

  const nonPaperPatterns = [
    // More generalized patterns for XML and classification content
    /^<\/?[a-zA-Z0-9_]+>/i, // Any XML tag open or close
    /^\\ccsdesc/i, // Any CCS descriptor
    /^\\acm[A-Z][a-zA-Z]*/i, // Any ACM command

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

  // Pre-process content to remove multi-line XML blocks and LaTeX environments
  // This helps handle cases where these tags span multiple lines
  content = content
    // Remove LaTeX environments that aren't part of the paper content
    .replace(/\\begin{CCSXML}[\s\S]*?\\end{CCSXML}/g, "")
    // More generalized approach to remove XML blocks with any tag name
    .replace(/<([a-zA-Z0-9_]+)>[\s\S]*?<\/\1>/g, "")
    // Remove LaTeX classification commands
    .replace(/\\ccsdesc\[.*?\]{.*?}/g, "");

  const lines = content.split("\n");
  const result: any[] = [];
  let currentParagraph: any[] = [];
  let currentSection: any = null;
  let currentSubsection: any = null;
  let currentSubsubsection: any = null;
  let blockIdIncrement = 0;
  let inAbstract = false;

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
      if (currentSubsection) {
        saveCurrentSubsection();
        // null 값 필터링
        if (currentSubsection && currentSubsection.content.length > 0) {
          currentSection.content.push(currentSubsection);
        }
      }
      // null 값 필터링
      if (Array.isArray(currentSection.content)) {
        currentSection.content = currentSection.content.filter(
          (item: any) => item !== null
        );
      }

      if (currentSection.content.length > 0) {
        result.push(currentSection);
      }
      currentSubsection = null;
      currentSubsubsection = null;
    }
  };

  // Helper function to save current subsection if it has content
  const saveCurrentSubsection = () => {
    if (currentSubsection && currentSection) {
      // 먼저 현재 subsubsection이 있으면 저장
      if (currentSubsubsection && currentSubsubsection.content.length > 0) {
        // null 값 필터링
        if (Array.isArray(currentSubsubsection.content)) {
          currentSubsubsection.content = currentSubsubsection.content.filter(
            (item: any) => item !== null
          );
        }
        currentSubsection.content.push(currentSubsubsection);
      }

      // null 값 필터링
      if (Array.isArray(currentSubsection.content)) {
        currentSubsection.content = currentSubsection.content.filter(
          (item: any) => item !== null
        );
      }

      // 현재 subsection이 내용이 있으면 section에 추가
      if (currentSubsection.content.length > 0) {
        currentSection.content.push(currentSubsection);
      }

      // 초기화
      currentSubsection = null;
      currentSubsubsection = null;
    }
  };

  // Helper function to save current subsubsection if it has content
  const saveCurrentSubsubsection = () => {
    if (
      currentSubsubsection &&
      currentSubsection &&
      currentSubsubsection.content.length > 0
    ) {
      currentSubsection.content.push(currentSubsubsection);
      currentSubsubsection = null;
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

  // Helper function to create a subsubsection block
  const createSubsubsectionBlock = (title: string, paragraphs: any[]): any => ({
    title: title,
    "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
    summary: "",
    intent: "",
    type: "subsubsection",
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
    if (
      isLatexCommand(lineWithoutComments) ||
      isNonPaperContent(lineWithoutComments)
    ) {
      return "";
    }

    // Skip if the line contains ACM conference information
    if (
      lineWithoutComments.includes("\\acmConference") ||
      lineWithoutComments.includes("\\acmBooktitle") ||
      lineWithoutComments.includes(
        "conference title from your rights confirmation emai"
      ) ||
      lineWithoutComments.includes("Woodstock") ||
      lineWithoutComments.includes("June 03--05")
    ) {
      return "";
    }

    // Clean up the line by removing LaTeX commands but keep the content
    let cleanedLine = lineWithoutComments;

    // First handle citations and refs that we want to preserve
    if (fileType === "latex") {
      // For LaTeX files, preserve original citation commands with curly braces format
      cleanedLine = cleanedLine
        .replace(
          /\\citet\s*{(.*?)}/g,
          (match, citation) => `\\citet{${citation}}`
        ) // Preserve citet citations
        .replace(
          /\\cite\s*{(.*?)}/g,
          (match, citation) => `\\cite{${citation}}`
        ) // Preserve regular citations
        .replace(
          /\\citep\s*{(.*?)}/g,
          (match, citation) => `\\citep{${citation}}`
        ) // Preserve citep citations
        .replace(
          /\\citealp\s*{(.*?)}/g,
          (match, citation) => `\\citealp{${citation}}`
        ) // Preserve citealp citations
        .replace(
          /\\citeauthor\s*{(.*?)}/g,
          (match, citation) => `\\citeauthor{${citation}}`
        ) // Preserve citeauthor citations
        .replace(
          /\\citeyear\s*{(.*?)}/g,
          (match, citation) => `\\citeyear{${citation}}`
        ); // Preserve citeyear citations
    } else {
      // For non-LaTeX files
      cleanedLine = cleanedLine
        .replace(
          /\\citet\s*{(.*?)}/g,
          (match, citation) => `\\citet{${citation}}`
        ) // Preserve citet citations
        .replace(
          /\\cite\s*{(.*?)}/g,
          (match, citation) => `\\cite{${citation}}`
        ) // Preserve regular citations
        .replace(/\[@(.*?)\]/g, (match, citation) => `{${citation}}`) // Convert markdown citations to braces
        .replace(/\\ref\s*{(.*?)}/g, (match, ref) => `\\ref{${ref}}`) // Preserve refs
        .replace(/~/g, ""); // Remove any tilde characters
    }

    // Then clean up other LaTeX commands
    cleanedLine = cleanedLine
      .replace(
        /\\(?!(cite|citet|citep|citealp|citeauthor|citeyear|ref|begin|end|item|itemize|figure|table|verbatim|lstlisting))[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?/g,
        ""
      ) // Remove all LaTeX commands except preserved ones
      .replace(/\\textbf{(.*?)}/g, "$1") // Remove textbf formatting
      .replace(/\\textit{(.*?)}/g, "$1") // Remove textit formatting
      .replace(/\\emph{(.*?)}/g, "$1") // Remove emph formatting
      .replace(/\\label{.*?}/g, "") // Remove labels
      .replace(/\\newcommand{.*?}{.*?}/g, "") // Remove newcommand definitions
      .replace(/\\newenvironment{.*?}{.*?}{.*?}/g, "") // Remove newenvironment definitions
      // Generalized approach to remove XML blocks with any tag name
      .replace(/<([a-zA-Z0-9_]+)>.*?<\/\1>/gs, "")
      // Generalized approach to remove self-closing XML tags
      .replace(/<[a-zA-Z0-9_]+\s*\/>/g, "")
      // Remove LaTeX classification commands
      .replace(/\\ccsdesc\[.*?\]{.*?}/g, "")
      // Remove ACM conference settings with a more generalized pattern
      .replace(/\\acm[A-Z][a-zA-Z]*{.*?}/g, "") // Matches all \acmXyz{...} commands
      .replace(/\\begin{itemize}/g, "") // Remove itemize begin
      .replace(/\\end{itemize}/g, "") // Remove itemize end
      .replace(/\\item\s*/g, "• ") // Replace \item with bullet point
      .replace(/\{(?!.*?\\cite|.*?\\ref|.*?\\citet).*?\}/g, "") // Remove curly braces and their content, except for citations and refs
      .replace(/\[(?!.*?citation:|.*?ref:).*?\]/g, "") // Remove any remaining square brackets and their content, except citation and ref markers
      .replace(/\[citation:(.*?)\]/g, "{$1}") // Convert citation markers to curly braces
      .replace(/\[ref:(.*?)\]/g, "{$1}") // Convert ref markers to curly braces
      .trim();

    // Make sure citations at end of paragraphs are preserved by checking if any were removed during cleanup
    const originalCitations = [];
    let match;

    // Find all citations in the original line
    const citationRegex =
      /\\cite\s*{([^}]+)}|\\citet\s*{([^}]+)}|\\citep\s*{([^}]+)}|\\citealp\s*{([^}]+)}|\\citeauthor\s*{([^}]+)}|\\citeyear\s*{([^}]+)}|\[@([^\]]+)\]/g;
    while ((match = citationRegex.exec(lineWithoutComments)) !== null) {
      const citationString =
        match[1] ||
        match[2] ||
        match[3] ||
        match[4] ||
        match[5] ||
        match[6] ||
        match[7];
      // Handle multiple citations separated by commas in a single \cite command
      const citations = citationString.split(",").map((c) => c.trim());
      originalCitations.push(...citations);
    }

    // Check if all original citations are in the cleaned line
    if (originalCitations.length > 0) {
      // Create proper citation format for all citations
      const allCitationsPresent = originalCitations.every((citation) => {
        // Check for individual citation
        const individualPresent =
          cleanedLine.includes(`\\cite{${citation}}`) ||
          cleanedLine.includes(`\\citet{${citation}}`) ||
          cleanedLine.includes(`\\citep{${citation}}`) ||
          cleanedLine.includes(`\\citealp{${citation}}`) ||
          cleanedLine.includes(`\\citeauthor{${citation}}`) ||
          cleanedLine.includes(`\\citeyear{${citation}}`);

        if (individualPresent) return true;

        // Check for citation as part of a multi-citation command
        // Look for patterns like \cite{key1,key2,key3} where our citation is one of the keys
        const multiCiteRegex = /\\cite\{([^}]+)\}/g;
        let multiMatch;
        while ((multiMatch = multiCiteRegex.exec(cleanedLine)) !== null) {
          const citationKeys = multiMatch[1].split(",").map((k) => k.trim());
          if (citationKeys.includes(citation)) return true;
        }

        // Same for other citation types
        const otherCiteTypes = [
          "\\citet",
          "\\citep",
          "\\citealp",
          "\\citeauthor",
          "\\citeyear",
        ];
        for (const citeType of otherCiteTypes) {
          const typeRegex = new RegExp(`${citeType}\\{([^}]+)\\}`, "g");
          let typeMatch;
          while ((typeMatch = typeRegex.exec(cleanedLine)) !== null) {
            const citationKeys = typeMatch[1].split(",").map((k) => k.trim());
            if (citationKeys.includes(citation)) return true;
          }
        }

        return false;
      });

      // If any citations are missing, add all of them at the end in proper format
      if (!allCitationsPresent) {
        // Remove any partial citations that might have been added incorrectly
        originalCitations.forEach((citation) => {
          cleanedLine = cleanedLine.replace(`[${citation}]`, "");
          cleanedLine = cleanedLine.replace(`{${citation}}`, "");
        });

        // Add all citations in proper format with \cite command
        if (originalCitations.length === 1) {
          cleanedLine = `${cleanedLine} \\cite{${originalCitations[0]}}`;
        } else {
          // For multiple citations, use \cite{cite1,cite2,cite3} format
          cleanedLine = `${cleanedLine} \\cite{${originalCitations.join(",")}}`;
        }
      }
    }

    // If the line contains itemize content, preserve it
    if (lineWithoutComments.includes("\\item")) {
      cleanedLine = lineWithoutComments
        .replace(/\\item\s*/g, "• ") // Replace \item with bullet point
        .replace(/\{(?!.*?\\cite|.*?\\ref|.*?\\citet).*?\}/g, "") // Remove curly braces and their content, except for citations and refs
        .replace(/\[(?!.*?citation:|.*?ref:).*?\]/g, "") // Remove any remaining square brackets and their content, except citation and ref markers
        .replace(/\[citation:(.*?)\]/g, "{$1}") // Convert citation markers to curly braces
        .replace(/\[ref:(.*?)\]/g, "{$1}") // Convert ref markers to curly braces
        .trim();

      // Also handle citations in itemized lists the same way
      const itemCitations = [];
      let itemMatch;

      // Find all citations in the original itemized line
      const itemCitationRegex =
        /\\cite\s*{([^}]+)}|\\citet\s*{([^}]+)}|\\citep\s*{([^}]+)}|\\citealp\s*{([^}]+)}|\\citeauthor\s*{([^}]+)}|\\citeyear\s*{([^}]+)}|\[@([^\]]+)\]/g;
      while (
        (itemMatch = itemCitationRegex.exec(lineWithoutComments)) !== null
      ) {
        const citationString =
          itemMatch[1] ||
          itemMatch[2] ||
          itemMatch[3] ||
          itemMatch[4] ||
          itemMatch[5] ||
          itemMatch[6] ||
          itemMatch[7];
        // Handle multiple citations separated by commas in a single \cite command
        const citations = citationString.split(",").map((c) => c.trim());
        itemCitations.push(...citations);
      }

      // Check if all original citations are in the cleaned line
      if (itemCitations.length > 0) {
        // Create proper citation format for all citations
        const allItemCitationsPresent = itemCitations.every((citation) => {
          // Check for individual citation
          const individualPresent =
            cleanedLine.includes(`\\cite{${citation}}`) ||
            cleanedLine.includes(`\\citet{${citation}}`) ||
            cleanedLine.includes(`\\citep{${citation}}`) ||
            cleanedLine.includes(`\\citealp{${citation}}`) ||
            cleanedLine.includes(`\\citeauthor{${citation}}`) ||
            cleanedLine.includes(`\\citeyear{${citation}}`);

          if (individualPresent) return true;

          // Check for citation as part of a multi-citation command
          // Look for patterns like \cite{key1,key2,key3} where our citation is one of the keys
          const multiCiteRegex = /\\cite\{([^}]+)\}/g;
          let multiMatch;
          while ((multiMatch = multiCiteRegex.exec(cleanedLine)) !== null) {
            const citationKeys = multiMatch[1].split(",").map((k) => k.trim());
            if (citationKeys.includes(citation)) return true;
          }

          // Same for other citation types
          const otherCiteTypes = [
            "\\citet",
            "\\citep",
            "\\citealp",
            "\\citeauthor",
            "\\citeyear",
          ];
          for (const citeType of otherCiteTypes) {
            const typeRegex = new RegExp(`${citeType}\\{([^}]+)\\}`, "g");
            let typeMatch;
            while ((typeMatch = typeRegex.exec(cleanedLine)) !== null) {
              const citationKeys = typeMatch[1].split(",").map((k) => k.trim());
              if (citationKeys.includes(citation)) return true;
            }
          }

          return false;
        });

        // If any citations are missing, add all of them at the end in proper format
        if (!allItemCitationsPresent) {
          // Remove any partial citations that might have been added incorrectly
          itemCitations.forEach((citation) => {
            cleanedLine = cleanedLine.replace(`[${citation}]`, "");
            cleanedLine = cleanedLine.replace(`{${citation}}`, "");
          });

          // Add all citations in proper format with \cite command
          if (itemCitations.length === 1) {
            cleanedLine = `${cleanedLine} \\cite{${itemCitations[0]}}`;
          } else {
            // For multiple citations, use \cite{cite1,cite2,cite3} format
            cleanedLine = `${cleanedLine} \\cite{${itemCitations.join(",")}}`;
          }
        }
      }
    }

    return cleanedLine;
  };

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Handle abstract environment
    if (trimmedLine === "\\begin{abstract}") {
      inAbstract = true;
      saveCurrentSection();
      currentSection = createSectionBlock("Abstract", []);
      continue;
    } else if (trimmedLine === "\\end{abstract}") {
      inAbstract = false;
      saveCurrentSection();
      continue;
    }

    // Skip empty lines
    if (!trimmedLine) {
      // If we have a current paragraph, save it
      if (currentParagraph && currentParagraph.length > 0) {
        const paragraph = createParagraphBlock(currentParagraph);

        // 단계별로 확인하여 적절한 위치에 추가
        if (currentSection) {
          if (currentSubsection) {
            if (currentSubsubsection) {
              currentSubsubsection.content.push(paragraph);
            } else {
              currentSubsection.content.push(paragraph);
            }
          } else {
            currentSection.content.push(paragraph);
          }
        } else {
          // 만약 아직 섹션이 없다면 기본 섹션 생성
          currentSection = createSectionBlock("Main Content", []);
          currentSection.content.push(paragraph);
        }

        currentParagraph = [];
      }
      continue;
    }

    // Handle section headers
    if (fileType === "latex") {
      // Skip section headers if we're in the abstract
      if (inAbstract) {
        // Clean and process the line
        const cleanedLine = cleanLatexContent(trimmedLine);

        // Only process if we have content after cleaning
        if (cleanedLine) {
          // Split into sentences - carefully handling citations
          const sentences = cleanedLine
            .split(/(?<=[.!?])\s+(?=[A-Z])/g) // Only split at punctuation followed by space and capital letter
            .filter((sentence) => {
              const cleaned = sentence.trim();
              return (
                cleaned.length > 0 &&
                cleaned.length >= 10 && // Minimum sentence length
                /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
                !/^[^a-zA-Z]*$/.test(cleaned) // Must not be only special characters
              );
            })
            .map((sentence) => createSentenceBlock(sentence.trim()));

          // If we have valid sentences, add them to the current paragraph
          if (sentences.length > 0) {
            currentParagraph = currentParagraph.concat(sentences);
          }
        }
        continue;
      }

      // Handle section headers with optional short title
      if (trimmedLine.includes("\\section[")) {
        const match = trimmedLine.match(/\\section\[(.*?)\]\{(.*?)\}/);
        if (match) {
          saveCurrentSection();
          const title = match[2];
          currentSection = createSectionBlock(title, []);
          currentSubsection = null;
          currentSubsubsection = null;
          currentParagraph = [];
        }
      }
      // Handle regular section headers
      else if (trimmedLine.includes("\\section{")) {
        const title =
          trimmedLine.match(/\\section{(.*?)}/)?.[1] || "Untitled Section";
        saveCurrentSection();
        currentSection = createSectionBlock(title, []);
        currentSubsection = null;
        currentSubsubsection = null;
        currentParagraph = [];
      }
      // Handle subsection headers with optional short title
      else if (trimmedLine.includes("\\subsection[")) {
        const match = trimmedLine.match(/\\subsection\[(.*?)\]\{(.*?)\}/);
        if (match) {
          saveCurrentSubsection();
          const title = match[2];
          currentSubsection = createSubsectionBlock(title, []);
          currentSubsubsection = null;
          currentParagraph = [];
        }
      }
      // Handle regular subsection headers
      else if (trimmedLine.includes("\\subsection{")) {
        const title =
          trimmedLine.match(/\\subsection{(.*?)}/)?.[1] ||
          "Untitled Subsection";
        saveCurrentSubsection();
        currentSubsection = createSubsectionBlock(title, []);
        currentSubsubsection = null;
        currentParagraph = [];
      }
      // Handle subsubsection headers with optional short title
      else if (trimmedLine.includes("\\subsubsection[")) {
        const match = trimmedLine.match(/\\subsubsection\[(.*?)\]\{(.*?)\}/);
        if (match) {
          saveCurrentSubsubsection();
          const title = match[2];
          currentSubsubsection = createSubsubsectionBlock(title, []);
          currentParagraph = [];
        }
      }
      // Handle regular subsubsection headers
      else if (trimmedLine.includes("\\subsubsection{")) {
        const title =
          trimmedLine.match(/\\subsubsection{(.*?)}/)?.[1] ||
          "Untitled Subsubsection";
        saveCurrentSubsubsection();
        currentSubsubsection = createSubsubsectionBlock(title, []);
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
          // Split into sentences - carefully handling citations
          const sentences = cleanedLine
            .split(/(?<=[.!?])\s+(?=[A-Z])/g) // Only split at punctuation followed by space and capital letter
            .filter((sentence) => {
              const cleaned = sentence.trim();
              return (
                cleaned.length > 0 &&
                cleaned.length >= 10 && // Minimum sentence length
                /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
                !/^[^a-zA-Z]*$/.test(cleaned) // Must not be only special characters
              );
            })
            .map((sentence) => createSentenceBlock(sentence.trim()));

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
        currentSubsubsection = null;
        currentParagraph = [];
      } else if (trimmedLine.startsWith("### ")) {
        saveCurrentSubsection();
        const title = trimmedLine.replace("### ", "").trim();
        currentSubsection = createSubsectionBlock(title, []);
        currentSubsubsection = null;
        currentParagraph = [];
      } else if (trimmedLine.startsWith("#### ")) {
        saveCurrentSubsubsection();
        const title = trimmedLine.replace("#### ", "").trim();
        currentSubsubsection = createSubsubsectionBlock(title, []);
        currentParagraph = [];
      }
      // Handle markdown content
      else {
        // Create default section if none exists
        if (!currentSection) {
          currentSection = createSectionBlock("Main Content", []);
        }

        // Split into sentences - carefully handling citations
        const sentences = trimmedLine
          .split(/(?<=[.!?])\s+(?=[A-Z])/g) // Only split at punctuation followed by space and capital letter
          .filter((sentence) => {
            const cleaned = sentence.trim();
            return (
              cleaned.length > 0 &&
              cleaned.length >= 10 && // Minimum sentence length
              /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
              !/^[^a-zA-Z]*$/.test(cleaned) // Must not be only special characters
            );
          })
          .map((sentence) => createSentenceBlock(sentence.trim()));

        // If we have valid sentences, create a paragraph
        if (sentences.length > 0) {
          currentParagraph = sentences;
          const paragraph = createParagraphBlock(currentParagraph);

          // 단계별로 확인하여 적절한 위치에 추가
          if (currentSection) {
            if (currentSubsection) {
              if (currentSubsubsection) {
                currentSubsubsection.content.push(paragraph);
              } else {
                currentSubsection.content.push(paragraph);
              }
            } else {
              currentSection.content.push(paragraph);
            }
          } else {
            // 만약 아직 섹션이 없다면 기본 섹션 생성
            currentSection = createSectionBlock("Main Content", []);
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

      // Split into sentences - carefully handling citations
      const sentences = trimmedLine
        .split(/(?<=[.!?])\s+(?=[A-Z])/g) // Only split at punctuation followed by space and capital letter
        .filter((sentence) => {
          const cleaned = sentence.trim();
          return (
            cleaned.length > 0 &&
            cleaned.length >= 10 && // Minimum sentence length
            /[a-zA-Z]/.test(cleaned) && // Must contain at least one letter
            !/^[^a-zA-Z]*$/.test(cleaned) // Must not be only special characters
          );
        })
        .map((sentence) => createSentenceBlock(sentence.trim()));

      // If we have valid sentences, create a paragraph
      if (sentences.length > 0) {
        currentParagraph = sentences;
        const paragraph = createParagraphBlock(currentParagraph);

        // 단계별로 확인하여 적절한 위치에 추가
        if (currentSection) {
          if (currentSubsection) {
            if (currentSubsubsection) {
              currentSubsubsection.content.push(paragraph);
            } else {
              currentSubsection.content.push(paragraph);
            }
          } else {
            currentSection.content.push(paragraph);
          }
        } else {
          // 만약 아직 섹션이 없다면 기본 섹션 생성
          currentSection = createSectionBlock("Main Content", []);
          currentSection.content.push(paragraph);
        }
      }
    }
  }

  // Save the last section and subsection
  saveCurrentSection();

  // 최종 결과에서 모든 null 값 제거
  const cleanResult = result.map((section: any) => {
    if (section && section.content) {
      // 섹션의 content에서 null 값 제거
      if (Array.isArray(section.content)) {
        section.content = section.content.filter((item: any) => item !== null);

        // 서브섹션 처리
        section.content = section.content.map((subsection: any) => {
          if (subsection && subsection.content) {
            // 서브섹션의 content에서 null 값 제거
            if (Array.isArray(subsection.content)) {
              subsection.content = subsection.content.filter(
                (item: any) => item !== null
              );

              // 서브서브섹션 처리
              subsection.content = subsection.content.map(
                (subsubsection: any) => {
                  if (subsubsection && subsubsection.content) {
                    // 서브서브섹션의 content에서 null 값 제거
                    if (Array.isArray(subsubsection.content)) {
                      subsubsection.content = subsubsection.content.filter(
                        (item: any) => item !== null
                      );
                    }
                  }
                  return subsubsection;
                }
              );
            }
          }
          return subsection;
        });
      }
    }
    return section;
  });

  return cleanResult;
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
