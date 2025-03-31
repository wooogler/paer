import { ContentType as SharedContentType } from "@paer/shared";

// 임시로 확장된 ContentType 정의
type ExtendedContentType = SharedContentType | "subsubsection";

// 기존 ContentType을 확장하여 subsubsection 포함
declare module "@paer/shared" {
  type ContentType = ExtendedContentType;
}
