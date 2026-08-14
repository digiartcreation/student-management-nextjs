import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ConflictError, NotFoundError } from "@/lib/errors";

type StudentInput = {
  rollNo: string;
  name: string;
  age: number;
  sectionId: number;
  parentMobile: string;
  status?: "ACTIVE" | "INACTIVE";
};

const studentInclude = { section: true } satisfies Prisma.StudentInclude;

export async function listStudents(filters: {
  search?: string;
  sectionId?: number;
  status?: "ACTIVE" | "INACTIVE";
  page: number;
  size: number;
  skip: number;
}) {
  const where: Prisma.StudentWhereInput = {
    sectionId: filters.sectionId,
    status: filters.status,
    ...(filters.search
      ? {
          OR: [
            { name: { contains: filters.search } },
            { rollNo: { contains: filters.search } },
            { parentMobile: { contains: filters.search } },
          ],
        }
      : {}),
  };

  const [content, totalElements] = await prisma.$transaction([
    prisma.student.findMany({
      where,
      include: studentInclude,
      skip: filters.skip,
      take: filters.size,
      orderBy: [{ section: { name: "asc" } }, { rollNo: "asc" }],
    }),
    prisma.student.count({ where }),
  ]);

  return { content, totalElements };
}

export async function getStudent(id: number) {
  const student = await prisma.student.findUnique({ where: { id }, include: studentInclude });
  if (!student) throw new NotFoundError("Student not found");
  return student;
}

async function ensureRollNoFree(rollNo: string, excludeId?: number) {
  const existing = await prisma.student.findUnique({ where: { rollNo } });
  if (existing && existing.id !== excludeId) {
    throw new ConflictError(`Roll number "${rollNo}" is already taken`);
  }
}

async function ensureSectionExists(sectionId: number) {
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section) throw new NotFoundError("Section not found");
}

export async function createStudent(data: StudentInput) {
  await ensureRollNoFree(data.rollNo);
  await ensureSectionExists(data.sectionId);
  return prisma.student.create({ data, include: studentInclude });
}

export async function updateStudent(id: number, data: StudentInput) {
  await getStudent(id);
  await ensureRollNoFree(data.rollNo, id);
  await ensureSectionExists(data.sectionId);
  return prisma.student.update({ where: { id }, data, include: studentInclude });
}

export async function updateStudentStatus(id: number, status: "ACTIVE" | "INACTIVE") {
  await getStudent(id);
  return prisma.student.update({ where: { id }, data: { status }, include: studentInclude });
}

/** Attendance and fee rows cascade with the student — see the schema relations. */
export async function deleteStudent(id: number) {
  await getStudent(id);
  await prisma.student.delete({ where: { id } });
}
