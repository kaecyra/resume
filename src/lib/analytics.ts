declare global {
  interface Window {
    umami?: {
      track: (event_name: string, properties?: Record<string, string>) => void;
    };
  }
}

export function filter_defined(obj: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function track(event_name: string, properties: Record<string, string>): void {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(event_name, properties);
  }
}

export function track_resume_view(props: {
  variant: string;
  slug?: string;
  company?: string;
}): void {
  track("resume_view", filter_defined(props));
}

export function track_letter_view(props: {
  variant: string;
  slug: string;
  company: string;
}): void {
  track("letter_view", props);
}

export function track_pdf_download(props: {
  variant: string;
  type: "resume" | "letter";
  slug?: string;
  company?: string;
}): void {
  track("pdf_download", filter_defined(props));
}
