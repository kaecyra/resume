export interface Contact {
  location: string;
  email: string;
  linkedin?: string;
}

export interface Profile {
  name: string;
  photo: string;
  contact: Contact;
}

export interface Skill {
  id: string;
  name: string;
  level: number;
}

export interface Highlight {
  title?: string;
  description: string;
}

export interface Employment {
  id: string;
  title: string;
  company: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  description: string | null;
  summary: string | null;
  highlights: Highlight[];
}

export interface Language {
  id: string;
  name: string;
  proficiency: string;
  level: number;
}

export interface Course {
  id: string;
  title: string;
  institution: string;
  date: string;
}

export interface Domain {
  id: string;
  title: string;
  description: string;
}

export interface FieldDeployment {
  id: string;
  category: string;
  title: string;
  venue: string;
  date: string | null;
  description: string;
}

export interface ResumeData {
  profile: Profile;
  skills: Skill[];
  domains: Domain[];
  field_deployments: FieldDeployment[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}

export interface VariantManifest {
  theme: string;
  title: string;
  summary: string;
  tagline?: string;
  online_callout?: string;
  skills: string[];
  domains?: string[];
  field_deployments?: string[];
  employment: string[];
  languages: string[];
  courses: string[];
}

export interface EmploymentOverride {
  id: string;
  summary?: string;
  highlights?: Highlight[];
}

export interface CoverLetter {
  greeting?: string;
  body: string;
  closing?: string;
}

export interface SubVariantManifest {
  parent: string;
  job: {
    url: string;
    company: string;
    title: string;
    fetched_at: string;
  };
  title?: string;
  summary?: string;
  tagline?: string;
  online_callout?: string;
  skills?: string[];
  domains?: string[];
  field_deployments?: string[];
  employment?: string[];
  languages?: string[];
  courses?: string[];
  employment_overrides?: EmploymentOverride[];
  cover_letter?: CoverLetter;
  cover_letter_enabled?: boolean;
}

export interface SubVariantEntry {
  parent: string;
  slug: string;
}

export interface ResolvedResume {
  theme: string;
  profile: Profile;
  title: string;
  summary: string;
  tagline?: string;
  online_callout?: string;
  online_url?: string;
  online_qr_svg?: string;
  skills: Skill[];
  domains: Domain[];
  field_deployments: FieldDeployment[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}
