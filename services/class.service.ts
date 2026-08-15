import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";

type ClassInput = { name: string; status?: "ACTIVE" | "INACTIVE" };

export async function listClasses() {
  const classes = await prisma.class.findMany({
    orderBy: { name: "asc" },
    include: {
      sections: { orderBy: { name: "asc" }, include: { _count: { select: { students: true } } } },
      _count: { select: { sections: true } },
    },
  });

  // The screen wants a head count per class as well as per section, and the
  // sections are already loaded, so it is summed here rather than re-queried.
  return classes.map(({ _count, sections, ...item }) => ({
    ...item,
    sectionCount: _count.sections,
    studentCount: sections.reduce((total, section) => total + section._count.students, 0),
    sections: sections.map(({ _count: sectionCount, ...section }) => ({
      ...section,
      studentCount: sectionCount.students,
    })),
  }));
}

export async function getClass(id: number) {
  const found = await prisma.class.findUnique({ where: { id } });
  if (!found) throw new NotFoundError("Class not found");
  return found;
}

async function ensureNameFree(name: string, excludeId?: number) {
  const existing = await prisma.class.findUnique({ where: { name } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(`Class "${name}" already exists`);
  }
}

export async function createClass(data: ClassInput) {
  await ensureNameFree(data.name);
  return prisma.class.create({ data });
}

export async function updateClass(id: number, data: ClassInput) {
  await getClass(id);
  await ensureNameFree(data.name, id);
  return prisma.class.update({ where: { id }, data });
}

/**
 * Refused while sections remain. The relation is `onDelete: Restrict`, so the
 * database would reject it anyway — checking first turns a driver-level foreign
 * key error into a message that says what to do about it.
 */
export async function deleteClass(id: number) {
  await getClass(id);
  const sectionCount = await prisma.section.count({ where: { classId: id } });
  if (sectionCount > 0) {
    throw new ConflictError(`Class still has ${sectionCount} section(s). Remove them first.`);
  }
  await prisma.class.delete({ where: { id } });
}
