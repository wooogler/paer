// MongoDB ObjectId 형식 검증
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
} 