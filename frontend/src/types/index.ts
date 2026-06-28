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
  warnings?: string[];
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

// --- CV Form Data Types ---

export interface BulletItem {
  id: string;
  text: string;
}

export interface SkillItem {
  id: string;
  text: string;
}

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: Array<{ id: string; label: string; url: string; side?: 'left' | 'right' }>;
  summary?: string;
  /** Ordered list of header fields: 'phone' | 'email' | 'location' | 'links' */
  personalOrder?: string[];
}

export interface WorkEntry {
  id: string;
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  bullets: BulletItem[];
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  location: string;
  gpa?: string;
  details: BulletItem[];
}

export interface SkillCategory {
  id: string;
  category: string;
  skills: SkillItem[];
}

export interface Project {
  id: string;
  name: string;
  year: string;
  description: string;
  technologies?: string;
  bullets?: BulletItem[];
}

export interface Award {
  id: string;
  year: string;
  title: string;
  description?: string;
}

export interface AdditionalEntry {
  id: string;
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  bullets: BulletItem[];
}

export interface AdditionalSection {
  id: string;
  title: string;
  entries: AdditionalEntry[];
}

export interface CVFormData {
  templateId: string;
  /** Ordered list of section ids: 'work' | 'education' | 'skills' | 'projects' | 'awards' | 'additional-{index}' */
  sectionOrder?: string[];
  /**
   * User-overridden display labels for built-in sections.
   * Keys: 'work' | 'education' | 'skills' | 'projects' | 'awards'.
   * Omitting a key falls back to the template default (e.g. 'Experience').
   */
  sectionLabels?: Record<string, string>;
  personalInfo: PersonalInfo;
  workExperience: WorkEntry[];
  education: EducationEntry[];
  skills: SkillCategory[];
  projects?: Project[];
  awards?: Award[];
  additionalSections?: AdditionalSection[];
}

export interface TailorAlternative {
  label: string;
  value: string | string[];
}

export interface TailorChange {
  id: string;
  fieldPath: string;           // e.g. "workExperience[0].bullets[2]"
  section: string;             // Human-readable: "Work Experience", "Skills"
  description: string;         // "Added 'data pipeline' keyword to bullet #2"
  currentValue: string | string[];
  alternatives: TailorAlternative[];
  changeType: 'modify' | 'add' | 'remove';
}

export interface TailorResponse {
  changes: TailorChange[];
  estimatedScore: number;
  summary: string;
}

export interface SectionAssistEntryContext {
  title?: string;
  organization?: string;
  dates?: string;
  extra?: string;
}

export interface SectionAssistRequest {
  sectionType: 'work' | 'education' | 'project' | 'additional';
  entryContext: SectionAssistEntryContext;
  userAnswer?: string;
  focus?: string;
  existingBullets?: string[];
}

export interface SectionAssistResult {
  bullets: string[];
  blocked: boolean;
  reason?: string;
}

export interface CVVersion {
  id: string;
  name: string;
  templateId: string;
  texContent: string;
  formData?: CVFormData;
  jobDescription?: string;
  companyName?: string;
  role?: string;
  matchScore?: number;
  baselineMatchScore?: number;
  parentVersionId?: string | null;
  createdAt: string;
}

export type CVVersionMeta = Omit<CVVersion, 'texContent' | 'formData'>;

export interface CVVersionWithChildren extends CVVersionMeta {
  children?: CVVersionMeta[];
}

// --- CV Import Types ---

export interface ImportConfidence {
  overall: 'high' | 'medium' | 'low';
  fields: Record<string, 'high' | 'medium' | 'low'>;
}

export interface ImportSummary {
  workEntries: number;
  educationEntries: number;
  skillCategories: number;
  projects: number;
  awards: number;
}

export interface CVImportResponse {
  success: boolean;
  formData: CVFormData | null;
  source: 'pdf' | 'docx' | 'json';
  confidence: ImportConfidence | null;
  summary: ImportSummary | null;
  warnings: string[] | null;
  error: string | null;
}
