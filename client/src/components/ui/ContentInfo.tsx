import React from "react";
import { Content, ContentType } from "@paer/shared";
import { useContentStore } from "../../store/useContentStore";
import { getTypeColor } from "../../utils/contentUtils";

interface ContentInfoProps {
  content: Content | null;
  path?: number[]; // Add path prop for hierarchical label
  lightText?: boolean; // 밝은 배경에 어두운 텍스트 또는 그 반대
  isClickable?: boolean; // 클릭 가능 여부
}

const ContentInfo: React.FC<ContentInfoProps> = ({
  content,
  path = [],
  lightText = false,
  isClickable = false,
}) => {
  const { setSelectedBlock } = useContentStore();

  if (!content) return null;

  // 콘텐츠 타입 영어로 변환 (첫 글자 대문자로)
  const contentType = content.type
    ? content.type.charAt(0).toUpperCase() + content.type.slice(1)
    : "Unknown";

  // 타입에 따른 색상 클래스 가져오기
  const colorClass = content.type ? getTypeColor(content.type as ContentType).main : "text-gray-500";

  // 콘텐츠 타입에 따라 표시할 텍스트 결정
  let contentTitle = "No title";

  if (content.title && content.title.trim() !== "") {
    contentTitle = content.title;
  } else if (content.intent && content.intent.trim() !== "") {
    contentTitle = content.intent;
  } else if (content.type === "sentence") {
    if (content.summary && content.summary.trim() !== "") {
      contentTitle = content.summary;
    } else if (typeof content.content === "string") {
      contentTitle =
        content.content.length > 60
          ? content.content.substring(0, 60) + "..."
          : content.content;
    } else {
      contentTitle = "No content";
    }
  } else if (content.type === "paragraph") {
    // Only use summary if it's non-empty and not 'Empty Summary'
    if (content.summary && content.summary.trim() !== "" && content.summary !== "Empty Summary") {
      contentTitle = content.summary;
    } else {
      // Use path prop if available
      const paragraphPath = path || (content as any).path;
      if (Array.isArray(paragraphPath)) {
        contentTitle = `Paragraph ${paragraphPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Paragraph";
      }
    }
  } else if (content.type === "subsection") {
    contentTitle = content.title && content.title.trim() !== "" ? content.title : "";
    if (!contentTitle) {
      const subsectionPath = path || (content as any).path;
      if (Array.isArray(subsectionPath)) {
        contentTitle = `Subsection ${subsectionPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Subsection";
      }
    }
  } else if (content.type === "subsubsection") {
    contentTitle = content.title && content.title.trim() !== "" ? content.title : "";
    if (!contentTitle) {
      const subsubsectionPath = path || (content as any).path;
      if (Array.isArray(subsubsectionPath)) {
        contentTitle = `Subsubsection ${subsubsectionPath.map((idx: number) => idx + 1).join(".")}`;
      } else {
        contentTitle = "Subsubsection";
      }
    }
  } else if (content.summary && content.summary.trim() !== "") {
    contentTitle = content.summary;
  }
  // If still no title, fallback to type + path
  if (!contentTitle || contentTitle === "No summary" || contentTitle === "No title") {
    const fallbackPath = path || (content as any).path;
    if (Array.isArray(fallbackPath)) {
      contentTitle = `${contentType} ${fallbackPath.map((idx: number) => idx + 1).join(".")}`;
    } else {
      contentTitle = contentType;
    }
  }

  // 클릭 핸들러 - 콘텐츠 선택 및 스크롤
  const handleContentClick = () => {
    if (!isClickable || !content["block-id"]) return;

    // 콘텐츠 타입별 경로 찾기 (재귀 함수)
    const findContentPath = (
      rootContent: any,
      targetId: string,
      currentPath: number[] = []
    ): number[] | null => {
      // 현재 노드가 타겟 노드인지 확인
      if (rootContent["block-id"] === targetId) {
        return currentPath;
      }

      // 하위 콘텐츠가 있는지 확인
      if (rootContent.content && Array.isArray(rootContent.content)) {
        // 각 하위 콘텐츠 검색
        for (let i = 0; i < rootContent.content.length; i++) {
          const childPath = findContentPath(rootContent.content[i], targetId, [
            ...currentPath,
            i,
          ]);
          if (childPath) return childPath;
        }
      }

      return null;
    };

    // 전체 콘텐츠 트리에서 경로 찾기
    const rootContent = useContentStore.getState().content;
    const path = findContentPath(rootContent, content["block-id"]);

    if (path) {
      // Sentence가 클릭된 경우, 상위 paragraph 찾기
      if (content.type === "sentence") {
        // sentence의 상위 paragraph 찾기
        if (path.length >= 2) {
          // paragraph.content[index] = sentence 구조이므로 최소 2단계 이상
          // paragraph 경로 (sentence 경로에서 마지막 요소 제거)
          const paragraphPath = path.slice(0, -1);

          // paragraph 콘텐츠 가져오기
          let paragraphContent: any = rootContent;
          for (const index of paragraphPath) {
            if (
              paragraphContent?.content &&
              Array.isArray(paragraphContent.content)
            ) {
              paragraphContent = paragraphContent.content[index];
            } else {
              paragraphContent = null;
              break;
            }
          }

          // 상위 paragraph가 있으면 selectedBlock으로 설정
          if (paragraphContent && paragraphContent.type === "paragraph") {
            // 먼저 content를 sentence로 설정 (Block 설정 전에)
            setSelectedBlock(content, path);

            // 그 다음 block을 paragraph로 설정 (이렇게 하면 selectedContent를 다시 덮어쓰지 않음)
            // useContentStore 내부의 로직을 우회하기 위해 직접 state 설정
            useContentStore.setState({
              selectedBlock: paragraphContent,
              selectedBlockPath: paragraphPath,
            });
          } else {
            // paragraph를 찾을 수 없으면 sentence 자체를 content와 block으로 설정
            setSelectedBlock(content, path);
            useContentStore.setState({
              selectedBlock: content,
              selectedBlockPath: path,
            });
          }
        } else {
          // 경로가 너무 짧으면 그냥 sentence 자체를 content와 block으로 설정
          setSelectedBlock(content, path);
          useContentStore.setState({
            selectedBlock: content,
            selectedBlockPath: path,
          });
        }
      } else {
        // Sentence가 아닌 경우, 일반적인 방식으로 처리
        setSelectedBlock(content, path);
      }

      // 요소로 스크롤
      setTimeout(() => {
        // 타겟 ID로 스크롤
        const element = document.querySelector(
          `[data-block-id="${content["block-id"]}"]`
        );
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    }
  };

  // 클릭 가능 여부에 따른 추가 클래스
  const clickableLabelClasses = isClickable
    ? "cursor-pointer hover:opacity-90 hover:scale-105 hover:shadow-sm active:opacity-75 transition-all duration-200"
    : "";

  // 항상 블록 형태로 표시 (배경색 적용)
  return (
    <div className={`border-b border-gray-200 p-2 text-sm text-gray-600 h-10`}>
      <div className="flex items-center">
        <span
          className={`font-medium ${colorClass} px-2 py-0.5 rounded text-xs mr-2 border border-current ${
            lightText ? "bg-opacity-20 text-white" : "bg-white/50"
          } ${clickableLabelClasses}`}
          onClick={isClickable ? handleContentClick : undefined}
          title={isClickable ? "Click to navigate to this content" : undefined}
          role={isClickable ? "button" : undefined}
        >
          {contentType}
        </span>
        <span
          className={`truncate font-medium max-w-[calc(100%-5rem)] ${
            lightText ? "text-white" : ""
          }`}
        >
          {contentTitle}
        </span>
      </div>
    </div>
  );
};

export default ContentInfo;
