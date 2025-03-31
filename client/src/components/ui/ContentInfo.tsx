import React from "react";
import { Content } from "@paer/shared";
import {
  getColorClass,
  getBackgroundColorClass,
} from "../editor/LevelIndicator";

interface ContentInfoProps {
  content: Content | null;
  variant?: "block"; // 항상 block 형태로 통일
  showBg?: boolean; // 배경색 표시 여부
  lightText?: boolean; // 밝은 배경에 어두운 텍스트 또는 그 반대
}

const ContentInfo: React.FC<ContentInfoProps> = ({
  content,
  showBg = true,
  lightText = false,
}) => {
  if (!content) return null;

  // 콘텐츠 타입 영어로 변환 (첫 글자 대문자로)
  const contentType =
    content.type.charAt(0).toUpperCase() + content.type.slice(1);

  // 타입에 따른 색상 클래스 가져오기
  const colorClass = getColorClass(content.type);
  const bgColorClass = showBg ? getBackgroundColorClass(content.type) : "";

  // 콘텐츠 타입에 따라 표시할 텍스트 결정
  let contentTitle = "No title";

  if (content.title) {
    // title이 있으면 title 사용
    contentTitle = content.title;
  } else if (content.type === "sentence") {
    // sentence인 경우 summary가 있으면 summary, 없으면 content 사용
    if (content.summary) {
      contentTitle = content.summary;
    } else if (typeof content.content === "string") {
      // content를 사용하되 길이를 제한하고 말줄임표 사용
      contentTitle =
        content.content.length > 60
          ? content.content.substring(0, 60) + "..."
          : content.content;
    } else {
      contentTitle = "No content";
    }
  } else if (content.type === "paragraph") {
    // paragraph는 summary 사용
    contentTitle = content.summary || "No summary";
  }

  // 항상 블록 형태로 표시 (배경색 적용)
  return (
    <div className={`border-b border-gray-200 p-2 text-sm text-gray-600`}>
      <div className="flex items-center">
        <span
          className={`font-medium ${colorClass} px-2 py-0.5 rounded text-xs mr-2 border border-current ${
            lightText ? "bg-opacity-20 text-white" : "bg-white/50"
          }`}
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
