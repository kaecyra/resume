// The hero's amber badge shows two visually distinct pieces - a mono role
// tag ("VP ENGINEERING") and a display-font company name (".MONKS") - from
// the single `hero.role` string the data model already carries ("VP
// Engineering, .Monks"). Splitting on the first comma keeps the YAML schema
// as it was rather than adding two new required fields for one badge.
export function split_role_badge(role: string): { tag: string; label: string } {
  const comma_index = role.indexOf(",");
  if (comma_index === -1) {
    return { tag: role.trim(), label: "" };
  }

  return {
    tag: role.slice(0, comma_index).trim(),
    label: role.slice(comma_index + 1).trim(),
  };
}
