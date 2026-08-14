import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";

type SectionInput = { name: string; status?: "ACTIVE" | "INACTIVE" };

export async function listSections() {
  const sections = await prisma.section.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { students: true } } },
  });

  return sections.map(({ _count, ...section }) => ({
    ...section,
    studentCount: _count.students,
  }));
}

export async function getSection(id: number) {
  const section = await prisma.section.findUnique({ where: { id } });
  if (!section) throw new NotFoundError("Section not found");
  return section;
}

async function ensureNameFree(name: string, excludeId?: number) {
  const existing = await prisma.section.findUnique({ where: { name } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(`Section "${name}" already exists`);
  }
}

export async function createSection(data: SectionInput) {
  await ensureNameFree(data.name);
  return prisma.section.create({ data });
}

export async function updateSection(id: number, data: SectionInput) {
  await getSection(id);
  await ensureNameFree(data.name, id);
  return prisma.section.update({ where: { id }, data });
}

export async function deleteSection(id: number) {
  await getSection(id);
  const studentCount = await prisma.student.count({ where: { sectionId: id } });
  if (studentCount > 0) {
    throw new ConflictError(`Section still has ${studentCount} student(s). Move or remove them first.`);
  }
  await prisma.section.delete({ where: { id } });
}
