// MongoDB ObjectId validation
export const isValidObjectId = (id: string): boolean => {
  // MongoDB ObjectId is a 24-character hexadecimal string
  return /^[0-9a-fA-F]{24}$/.test(id);
}; 