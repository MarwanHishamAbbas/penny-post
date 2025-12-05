// Helper to extract field name from database error
export const extractFieldFromDetail = (detail: string): string | undefined => {
  const match = detail?.match(/Key \((\w+)\)/);
  return match ? match[1] : undefined;
};
