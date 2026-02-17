import type { ParamMatcher } from "@sveltejs/kit";

export const match: ParamMatcher = (param) => /^[a-f0-9]{8}$/.test(param);
