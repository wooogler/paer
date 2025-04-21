// MongoDB ObjectId validation
export const isValidObjectId = (id: string): boolean => {
  // MongoDB ObjectId는 24자리의 16진수 문자열입니다
  return /^[0-9a-fA-F]{24}$/.test(id);
}; 