import { env } from "$env/dynamic/public";

import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = () => {
  return {
    umami_url: env.PUBLIC_UMAMI_URL ?? "",
    umami_website_id: env.PUBLIC_UMAMI_WEBSITE_ID ?? "",
  };
};
