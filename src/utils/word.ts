/* -------------------------------------------------------------------------- */
/*                        WORD ADD-IN UTILITIES                               */
/* -------------------------------------------------------------------------- */

import { cleanWordText } from './normalize';

/**
 * Get text from Word document (selection or full body)
 */
export const getTextFromWord = async (): Promise<string> => {
  return new Promise((resolve) => {
    Word.run(async (context) => {
      const selection = context.document.getSelection();
      selection.load(['text', 'isEmpty']);
      await context.sync();

      let targetText = '';
      if (!selection.isEmpty && selection.text.trim().length > 0) {
        targetText = selection.text;
      } else {
        const body = context.document.body;
        body.load('text');
        await context.sync();
        targetText = body.text;
      }
      
      const cleanText = cleanWordText(targetText);
      resolve(cleanText);
    }).catch((error) => {
      console.error('Error reading Word:', error);
      resolve('');
    });
  });
};

/**
 * Highlight text in Word document
 */
export const highlightInWord = async (
  text: string, 
  color: string, 
  position?: number
): Promise<void> => {
  const cleanText = text.trim();
  if (!cleanText) return;

  const hasSpace = /\s/.test(cleanText);

  await Word.run(async (context) => {
    const body = context.document.body;

    // Try position-based highlighting for single words
    if (typeof position === 'number' && position >= 0 && !hasSpace) {
      const whole = body.getRange("Whole");
      const words = whole.getTextRanges([" ", "\r", "\n", "\t"], true);
      words.load("items");
      await context.sync();

      if (position < words.items.length) {
        const targetRange = words.items[position];
        targetRange.font.highlightColor = color;
        await context.sync();
        return;
      }
    }

    // Fallback to search-based highlighting
    const results = body.search(cleanText, { 
      matchCase: false,
      matchWholeWord: !hasSpace,
      ignoreSpace: true 
    });
    results.load('font');
    await context.sync();
    
    for (let i = 0; i < results.items.length; i++) {
      results.items[i].font.highlightColor = color;
    }
    await context.sync();
  }).catch(console.error);
};

/**
 * Replace text in Word document
 * Returns true if replacement was successful
 */
export const replaceInWord = async (
  oldText: string, 
  newText: string, 
  position?: number
): Promise<boolean> => {
  const cleanOldText = oldText.trim();
  if (!cleanOldText) return false;
  
  const hasSpace = /\s/.test(cleanOldText);
  let success = false;

  await Word.run(async (context) => {
    const body = context.document.body;

    // Try position-based replacement for single words
    if (typeof position === 'number' && position >= 0 && !hasSpace) {
      const whole = body.getRange("Whole");
      const words = whole.getTextRanges([" ", "\r", "\n", "\t"], true);
      words.load("items");
      await context.sync();

      if (position < words.items.length) {
        const target = words.items[position];
        target.insertText(newText, Word.InsertLocation.replace);
        target.font.highlightColor = "None";
        await context.sync();
        success = true;
        return;
      }
    }

    // Fallback to search-based replacement
    const results = body.search(cleanOldText, { 
      matchCase: false,
      matchWholeWord: !hasSpace,
      ignoreSpace: true 
    });
    results.load('items');
    await context.sync();

    if (results.items.length > 0) {
      results.items.forEach((item) => {
        item.insertText(newText, Word.InsertLocation.replace);
        item.font.highlightColor = "None";
      });
      await context.sync();
      success = true;
    }
  }).catch(console.error);

  return success;
};

/**
 * Clear all highlights from Word document
 */
export const clearHighlights = async (): Promise<void> => {
  await Word.run(async (context) => {
    context.document.body.font.highlightColor = "None";
    await context.sync();
  }).catch(console.error);
};