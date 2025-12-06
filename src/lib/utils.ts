// Helper to extract field name from database error
export const extractFieldFromDetail = (detail: string): string | undefined => {
  const match = detail?.match(/Key \((\w+)\)/);
  return match ? match[1] : undefined;
};

export function decodeCursor(
  cursor: string,
): { created_at: string; id: number } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

export function encodeCursor(data: {
  created_at: Date | string;
  id: number;
}): string {
  const cursorString = JSON.stringify({
    created_at: data.created_at,
    id: data.id,
  });
  return Buffer.from(cursorString).toString('base64');
}
