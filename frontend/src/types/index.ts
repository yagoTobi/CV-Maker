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

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  links: Array<{ label: string; url: string }>;
  summary?: string;
  /** Ordered list of header fields: 'phone' | 'email' | 'location' | 'links' */
  personalOrder?: string[];
}

export interface WorkEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  bullets: string[];
}

export interface EducationEntry {
  school: string;
  degree: string;
  startDate: string;
  endDate: string;
  location: string;
  gpa?: string;
  details: string[];
}

export interface SkillCategory {
  category: string;
  skills: string[];
}

export interface Project {
  name: string;
  year: string;
  description: string;
  technologies?: string;
  bullets?: string[];
}

export interface Award {
  year: string;
  title: string;
  description?: string;
}

export interface AdditionalEntry {
  title: string;
  subtitle?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  description?: string;
  bullets: string[];
}

export interface AdditionalSection {
  title: string;
  entries: AdditionalEntry[];
}

export interface CVFormData {
  templateId: string;
  /** Ordered list of section ids: 'work' | 'education' | 'skills' | 'projects' | 'awards' | 'additional-{index}' */
  sectionOrder?: string[];
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
