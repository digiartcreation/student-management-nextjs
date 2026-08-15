/**
 * The "10-A" label, rebuilt from the class and section that now hold its two
 * halves.
 *
 * Before classes existed, `Section.name` *was* this string and screens printed
 * it directly. Splitting the table left every one of those call sites showing a
 * bare "A", so they all route through here instead. The class is optional only
 * so a caller that could not include the relation degrades to the section
 * letter rather than crashing.
 */
export const sectionLabel = (section: {
  name: string;
  class?: { name: string } | null;
}): string => (section.class ? `${section.class.name}-${section.name}` : section.name);
