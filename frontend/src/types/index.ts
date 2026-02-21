export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface AdditionalExperience {
  topic: string;
  description: string;
  added_from_job?: string;
}

export interface UserProfile {
  additional_experiences: AdditionalExperience[];
  skills_mentioned: string[];
  conversation_history: Message[];
}

export interface CompileResponse {
  success: boolean;
  pdf_base64?: string;
  error?: string;
  page_count: number;
}

export interface ChatRequest {
  messages: Message[];
  cv_content: string;
  job_description: string;
  company_name?: string;
  user_profile?: UserProfile;
  stream?: boolean;
}

export interface MatchAnalysis {
  requirements: string[];
  matching: string[];
  missing: string[];
  suggestions: string[];
  match_score: number;
}

export interface CVEdit {
  find: string;
  replace: string;
}

// Utility function to parse edits from AI response
export function parseEditsFromResponse(content: string): CVEdit[] {
  const edits: CVEdit[] = [];
  const editRegex = /<<<EDIT>>>\s*FIND:\s*([\s\S]*?)\s*REPLACE:\s*([\s\S]*?)\s*<<<END_EDIT>>>/g;

  let match;
  while ((match = editRegex.exec(content)) !== null) {
    edits.push({
      find: match[1].trim(),
      replace: match[2].trim()
    });
  }

  return edits;
}

// Normalize whitespace for comparison (but preserve for replacement)
function normalizeWhitespace(str: string): string {
  return str.replace(/\s+/g, ' ').trim();
}

// Find the actual text in CV that matches the normalized version
function findActualMatch(cvContent: string, searchText: string): string | null {
  const normalizedSearch = normalizeWhitespace(searchText);

  // Try exact match first
  if (cvContent.includes(searchText)) {
    return searchText;
  }

  // Try to find a substring that normalizes to the same thing
  // Split CV into chunks and try to find matching section
  const lines = cvContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    // Try increasingly larger chunks starting from each line
    for (let j = i; j < Math.min(i + 10, lines.length); j++) {
      const chunk = lines.slice(i, j + 1).join('\n');
      if (normalizeWhitespace(chunk) === normalizedSearch) {
        return chunk;
      }
    }
  }

  // Try single line matches
  for (const line of lines) {
    if (normalizeWhitespace(line) === normalizedSearch) {
      return line;
    }
  }

  return null;
}

// Apply edits to CV content
export function applyEdit(cvContent: string, edit: CVEdit): string | null {
  // Try exact match first
  if (cvContent.includes(edit.find)) {
    return cvContent.replace(edit.find, edit.replace);
  }

  // Try to find with normalized whitespace
  const actualMatch = findActualMatch(cvContent, edit.find);
  if (actualMatch) {
    return cvContent.replace(actualMatch, edit.replace);
  }

  // Try trimmed version
  const trimmedFind = edit.find.trim();
  if (cvContent.includes(trimmedFind)) {
    return cvContent.replace(trimmedFind, edit.replace);
  }

  return null; // Edit couldn't be applied
}
