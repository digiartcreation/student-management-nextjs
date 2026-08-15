import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";

type SectionInput = { classId: number; name: string; status?: "ACTIVE" | "INACTIVE" };

const sectionInclude = { class: true } satisfies Prisma.SectionInclude;

/**
 * Sections always travel with their class. `label` is the "10-A" form the
 * screens used to read straight out of `name`, rebuilt here so every dropdown
 * and report keeps showing something a person recognises without each of them
 * re-joining the two halves.
 */
const withLabel = <T extends { name: string; class: { name: string } }>(section: T) => ({
  ...section,
  label: `${section.class.name}-${section.name}`,
});

export async function listSections(filters: { classId?: number } = {}) {
  const sections = await prisma.section.findMany({
    where: { classId: filters.classId },
    orderBy: [{ class: { name: "asc" } }, { name: "asc" }],
    include: { ...sectionInclude, _count: { select: { students: true } } },
  });

  return sections.map(({ _count, ...section }) => ({
    ...withLabel(section),
    studentCount: _count.students,
  }));
}

export async function getSection(id: number) {
  const section = await prisma.section.findUnique({ where: { id }, include: sectionInclude });
  if (!section) throw new NotFoundError("Section not found");
  return withLabel(section);
}

/** Unique within its class now, so both halves of the key are needed. */
async function ensureNameFree(classId: number, name: string, excludeId?: number) {
  const existing = await prisma.section.findUnique({
    where: { classId_name: { classId, name } },
  });
  if (existing && existing.id !== excludeId) {
    const parent = await prisma.class.findUnique({ where: { id: classId } });
    throw new ConflictError(`Section "${name}" already exists in class ${parent?.name ?? classId}`);
  }
}

async function ensureClassExists(classId: number) {
  const parent = await prisma.class.findUnique({ where: { id: classId } });
  if (!parent) throw new NotFoundError("Class not found");
}

export async function createSection(data: SectionInput) {
  await ensureClassExists(data.classId);
  await ensureNameFree(data.classId, data.name);
  const created = await prisma.section.create({ data, include: sectionInclude });
  return withLabel(created);
}

export async function updateSection(id: number, data: SectionInput) {
  await getSection(id);
  await ensureClassExists(data.classId);
  await ensureNameFree(data.classId, data.name, id);
  const updated = await prisma.section.update({ where: { id }, data, include: sectionInclude });
  return withLabel(updated);
}

export async function deleteSection(id: number) {
  await getSection(id);
  const studentCount = await prisma.student.count({ where: { sectionId: id } });
  if (studentCount > 0) {
    throw new ConflictError(`Section still has ${studentCount} student(s). Move or remove them first.`);
  }
  await prisma.section.delete({ where: { id } });
}
