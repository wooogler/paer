import fs from "fs";
import path from "path";
import { ContentTypeSchemaEnum } from "@paer/shared/schemas/contentSchema";

// 데이터 디렉토리 찾고 생성하는 유틸리티 함수
export function findOrCreateDataDir(): string {
  const possibleDataDirs = [
    path.join(__dirname, "../../data"),
    path.join(process.cwd(), "data"),
    path.join(process.cwd(), "server/dist/data"),
    path.join(process.cwd(), "server/data"),
  ];

  for (const dir of possibleDataDirs) {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created data directory at: ${dir}`);
      }

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

export function generateBlockId(baseTimestamp: number, increment: number): string {
  return `${baseTimestamp + increment}`;
}

export function isPlotOrFigure(line: string): boolean {
  const plotPatterns = [
    /^!\[.*?\]\(.*?\)/,
    /^<img.*?>/,
    /^```.*?(plot|figure|graph|chart).*?```/,
    /^<figure>/,
    /^<div.*?class=".*?(plot|figure|graph|chart).*?">/,
    /\\begin{figure}/,
    /\\begin{figure\*}/,
    /\\includegraphics/,
    /\\begin{verbatim}/,
    /\\begin{lstlisting}/,
    /\\begin{minted}/,
    /\\begin{frame}/,
    /\\begin{center}/,
    /\\begin{table}/,
    /\\begin{tabular}/,
  ];

  return plotPatterns.some((pattern) => pattern.test(line.trim()));
}

export function isLatexComment(line: string): boolean {
  return line.trim().startsWith("%");
}

export function isLatexCommand(line: string): boolean {
  const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();
  if (!lineWithoutComments) return false;

  if (
    lineWithoutComments.includes("\\item") ||
    lineWithoutComments.includes("\\citet")
  )
    return false;

  if (
    lineWithoutComments === "\\begin{abstract}" ||
    lineWithoutComments === "\\end{abstract}"
  )
    return false;

  if (/^<\/?[a-zA-Z0-9_]+>/.test(lineWithoutComments)) {
    return true;
  }

  return (
    /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?/.test(lineWithoutComments) ||
    /^\\ccsdesc/.test(lineWithoutComments) ||
    /^\\begin{CCSXML}/.test(lineWithoutComments) ||
    /^\\end{CCSXML}/.test(lineWithoutComments) ||
    /^[a-zA-Z]+(?:top|bottom|left|right|inner|outer)margin=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^[a-zA-Z]+(?:width|height|depth|size)=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^[a-zA-Z]+(?:space|skip|vspace|hspace)=\d+pt(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^[a-zA-Z]+(?:color|style|background|linecolor|frametitlebackgroundcolor)=[a-zA-Z]+(?:!?\d+)?(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^[a-zA-Z]+(?:frame|title|frametitle)=[^,]+(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^[a-zA-Z]+(?:conference|date|year|month|day)=[^,]+(?:,)?$/.test(
      lineWithoutComments
    ) ||
    /^\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(
      lineWithoutComments
    ) ||
    /^\\definecolor{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
    /^\\[a-zA-Z]+(?:\[.*?\])?(?:{.*?})?(?:\s*%)?$/.test(lineWithoutComments) ||
    /\\acm(?:Conference|Journal|Volume|Number|Price|DOI|ISBN|ISSN|SubmissionID|Article|Year|Month|Day|Date|Location|City|Country|State|Region|Category|Subject|Keywords|Terms|Format|Style|Template|Copyright|Permission|Notice|Reference|Abstract|Acknowledgments|Bibliography|Appendix)/.test(
      lineWithoutComments
    ) ||
    /^\\acmConference\[.*?\]{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
    /^\\acmBooktitle{.*?}$/.test(lineWithoutComments) ||
    /^frametitlefont=.*$/.test(lineWithoutComments) ||
    /^\\newenvironment{.*?}{.*?}{.*?}$/.test(lineWithoutComments) ||
    /^\\newcommand{.*?}{.*?}$/.test(lineWithoutComments) ||
    /^\\begin{(?!itemize).*?}$/.test(lineWithoutComments) ||
    /^\\end{(?!itemize).*?}$/.test(lineWithoutComments) ||
    /^[a-zA-Z]+(?:\[.*?\])?=.*$/.test(lineWithoutComments) ||
    /^\[.*?\]$/.test(lineWithoutComments) ||
    /^[a-zA-Z]+=.*$/.test(lineWithoutComments)
  );
}

export function isNonPaperContent(line: string): boolean {
  const lineWithoutComments = line.replace(/(?<!\\)%.*$/, "").trim();
  if (!lineWithoutComments) return false;

  if (
    lineWithoutComments === "\\begin{abstract}" ||
    lineWithoutComments === "\\end{abstract}"
  )
    return false;

  if (
    /^<\/?[a-zA-Z0-9_]+>/.test(lineWithoutComments) ||
    /^\\ccsdesc/.test(lineWithoutComments) ||
    /^\\acm[A-Z][a-zA-Z]*/i.test(lineWithoutComments)
  ) {
    return true;
  }

  const nonPaperPatterns = [
    /^<\/?[a-zA-Z0-9_]+>/i,
    /^\\ccsdesc/i,
    /^\\acm[A-Z][a-zA-Z]*/i,
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
    /^Email:/i,
    /^Address:/i,
    /^Affiliation:/i,
    /^Department of/i,
    /^University of/i,
    /^School of/i,
    /^Institute of/i,
    /^Contact:/i,
    /^Corresponding author:/i,
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
    /^Abstract:/i,
    /^Table of Contents/i,
    /^List of Figures/i,
    /^List of Tables/i,
    /^Acknowledgments?:/i,
    /^References:/i,
    /^Bibliography:/i,
    /^Appendix:/i,
    /^[-=_*]{3,}$/,
    /^\s*$/,
    /^"[a-zA-Z_]+":\s*"[0-9]+"$/,
    /^"[a-zA-Z_]+":\s*[0-9]+$/,
    /^"[a-zA-Z_]+":\s*"[0-9]+",$/,
    /^"[a-zA-Z_]+":\s*[0-9]+,$/,
    /^%.*$/,
    /^\\setcopyright{.*}$/,
    /^\\acmSetup{.*}$/,
    /^\\acmSubmissionID{.*}$/,
    /^\\acmPrice{.*}$/,
    /^\\acmDOI{.*}$/,
    /^\\acmISBN{.*}$/,
    /^\\acmISSN{.*}$/,
    /^\\acmArticle{.*}$/,
    /^\\acmYear{.*}$/,
    /^\\acmMonth{.*}$/,
    /^\\acmDay{.*}$/,
    /^\\acmDate{.*}$/,
    /^\\acmLocation{.*}$/,
    /^\\acmCity{.*}$/,
    /^\\acmCountry{.*}$/,
    /^\\acmState{.*}$/,
    /^\\acmRegion{.*}$/,
    /^\\acmCategory{.*}$/,
    /^\\acmSubject{.*}$/,
    /^\\acmKeywords{.*}$/,
    /^\\acmTerms{.*}$/,
    /^\\acmFormat{.*}$/,
    /^\\acmStyle{.*}$/,
    /^\\acmTemplate{.*}$/,
    /^\\acmCopyright{.*}$/,
    /^\\acmPermission{.*}$/,
    /^\\acmNotice{.*}$/,
    /^\\acmReference{.*}$/,
    /^\\acmAbstract{.*}$/,
    /^\\acmAcknowledgments{.*}$/,
    /^\\acmBibliography{.*}$/,
    /^\\acmAppendix{.*}$/,
    /^\\definecolor{.*?}{.*?}{.*?}$/,
    /^\\color{.*?}$/,
    /^\\textcolor{.*?}{.*?}$/,
    /^\\pagecolor{.*?}$/,
    /^\\colorbox{.*?}{.*?}$/,
    /^\\fcolorbox{.*?}{.*?}{.*?}$/,
    /\\acmConference{.*?}/,
    /\\acmJournal{.*?}/,
    /\\acmVolume{.*?}/,
    /\\acmNumber{.*?}/,
    /\\acmPrice{.*?}/,
    /\\acmDOI{.*?}/,
    /\\acmISBN{.*?}/,
    /\\acmISSN{.*?}/,
    /\\acmSubmissionID{.*?}/,
    /\\acmArticle{.*?}/,
    /\\acmYear{.*?}/,
    /\\acmMonth{.*?}/,
    /\\acmDay{.*?}/,
    /\\acmDate{.*?}/,
    /\\acmLocation{.*?}/,
    /\\acmCity{.*?}/,
    /\\acmCountry{.*?}/,
    /\\acmState{.*?}/,
    /\\acmRegion{.*?}/,
    /\\acmCategory{.*?}/,
    /\\acmSubject{.*?}/,
    /\\acmKeywords{.*?}/,
    /\\acmTerms{.*?}/,
    /\\acmFormat{.*?}/,
    /\\acmStyle{.*?}/,
    /\\acmTemplate{.*?}/,
    /\\acmCopyright{.*?}/,
    /\\acmPermission{.*?}/,
    /\\acmNotice{.*?}/,
    /\\acmReference{.*?}/,
    /\\acmAbstract{.*?}/,
    /\\acmAcknowledgments{.*?}/,
    /\\acmBibliography{.*?}/,
    /\\acmAppendix{.*?}/,
    /\\acmBooktitle{.*?}/,
  ];

  return nonPaperPatterns.some((pattern) => pattern.test(lineWithoutComments));
}

export function detectFileType(content: string): "latex" | "markdown" | "text" {
  if (
    content.includes("\\documentclass") ||
    content.includes("\\begin{document}")
  ) {
    return "latex";
  }

  if (
    content.includes("# ") ||
    content.includes("## ") ||
    content.includes("### ")
  ) {
    return "markdown";
  }

  return "text";
}

export function extractTitle(
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
      const firstLine = content.split("\n").find((line) => line.trim());
      return firstLine ? firstLine.trim() : "Untitled Paper";
  }
}

export function processLatexContent(content: string, baseTimestamp: number): any[] {
  const lines = content.split("\n");
  const result: any[] = [];
  let currentParagraph: any[] = [];
  let currentSection: any = null;
  let currentSubsection: any = null;
  let currentSubsubsection: any = null;
  let blockIdIncrement = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines
    if (!trimmedLine) {
      if (currentParagraph.length > 0) {
        const paragraph = {
          "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
          summary: "",
          intent: "",
          type: "paragraph",
          content: currentParagraph,
        };

        if (currentSubsubsection) {
          currentSubsubsection.content.push(paragraph);
        } else if (currentSubsection) {
          currentSubsection.content.push(paragraph);
        } else if (currentSection) {
          currentSection.content.push(paragraph);
        } else {
          result.push(paragraph);
        }

        currentParagraph = [];
      }
      continue;
    }

    // Handle section headers
    if (trimmedLine.startsWith("\\section{")) {
      const title = trimmedLine.match(/\\section{(.*?)}/)?.[1] || "Untitled Section";
      if (currentSection) {
        result.push(currentSection);
      }
      currentSection = {
        title,
        "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
        summary: "",
        intent: "",
        type: "section",
        content: [],
      };
      currentSubsection = null;
      currentSubsubsection = null;
    }
    // Handle subsection headers
    else if (trimmedLine.startsWith("\\subsection{")) {
      const title = trimmedLine.match(/\\subsection{(.*?)}/)?.[1] || "Untitled Subsection";
      if (currentSubsection) {
        currentSection?.content.push(currentSubsection);
      }
      currentSubsection = {
        title,
        "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
        summary: "",
        intent: "",
        type: "subsection",
        content: [],
      };
      currentSubsubsection = null;
    }
    // Handle subsubsection headers
    else if (trimmedLine.startsWith("\\subsubsection{")) {
      const title = trimmedLine.match(/\\subsubsection{(.*?)}/)?.[1] || "Untitled Subsubsection";
      if (currentSubsubsection) {
        currentSubsection?.content.push(currentSubsubsection);
      }
      currentSubsubsection = {
        title,
        "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
        summary: "",
        intent: "",
        type: "subsubsection",
        content: [],
      };
    }
    // Handle regular content
    else if (!isLatexCommand(trimmedLine) && !isNonPaperContent(trimmedLine)) {
      const sentence = {
        "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
        summary: "",
        intent: "",
        type: "sentence",
        content: trimmedLine,
      };
      currentParagraph.push(sentence);
    }
  }

  // Save any remaining content
  if (currentParagraph.length > 0) {
    const paragraph = {
      "block-id": generateBlockId(baseTimestamp, blockIdIncrement++),
      summary: "",
      intent: "",
      type: "paragraph",
      content: currentParagraph,
    };

    if (currentSubsubsection) {
      currentSubsubsection.content.push(paragraph);
    } else if (currentSubsection) {
      currentSubsection.content.push(paragraph);
    } else if (currentSection) {
      currentSection.content.push(paragraph);
    } else {
      result.push(paragraph);
    }
  }

  if (currentSubsubsection) {
    currentSubsection?.content.push(currentSubsubsection);
  }
  if (currentSubsection) {
    currentSection?.content.push(currentSubsection);
  }
  if (currentSection) {
    result.push(currentSection);
  }

  return result;
} 