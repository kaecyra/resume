export interface Contact {
  address: string;
  phone: string;
  email: string;
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

export interface ResumeData {
  profile: Profile;
  skills: Skill[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}

export interface VariantManifest {
  theme: string;
  title: string;
  summary: string;
  skills: string[];
  employment: string[];
  languages: string[];
  courses: string[];
}

export interface ResolvedResume {
  theme: string;
  profile: Profile;
  title: string;
  summary: string;
  skills: Skill[];
  employment: Employment[];
  languages: Language[];
  courses: Course[];
}
