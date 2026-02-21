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

// Apply edits to CV content
export function applyEdit(cvContent: string, edit: CVEdit): string | null {
  if (cvContent.includes(edit.find)) {
    return cvContent.replace(edit.find, edit.replace);
  }
  return null; // Edit couldn't be applied
}
