/* -------------------------------------------------------------------------- */
/*                        JSON PARSING & FIXING                               */
/* -------------------------------------------------------------------------- */

/**
 * Parse potentially malformed JSON from AI response
 * - Tries direct JSON.parse first
 * - Falls back to extracting JSON object from text
 */
export const parseAIResponse = (raw: string): any | null => {
  if (!raw || !raw.trim()) return null;

  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON object from text
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.error('JSON parse error (inner):', e, match[0]);
        return null;
      }
    }
    console.error('JSON parse error (outer): raw =', raw);
    return null;
  }
};

/**
 * Extract text content from Gemini API response
 */
export const extractTextFromGeminiResponse = (data: any): string => {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  
  return parts
    .map((p: any) => p.text ?? '')
    .join('')
    .trim();
};