import { AttendanceStatus, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BLOOD_GROUPS } from "../validations/student.schema";

const prisma = new PrismaClient();

/** Written as "class-section"; the seed splits each into the two records. */
const SECTIONS = ["8-A", "9-A", "10-A", "10-B"];

const STUDENTS = [
  { rollNo: "R101", name: "Rahul Kumar", age: 15, section: "10-A", parentMobile: "9876543210" },
  { rollNo: "R102", name: "Priya Sharma", age: 15, section: "10-A", parentMobile: "9876543211" },
  { rollNo: "R103", name: "Arjun Nair", age: 16, section: "10-B", parentMobile: "9876543212" },
  { rollNo: "R104", name: "Sneha Patel", age: 14, section: "9-A", parentMobile: "9876543213" },
  { rollNo: "R105", name: "Vikram Singh", age: 14, section: "9-A", parentMobile: "9876543214" },
  { rollNo: "R106", name: "Aisha Khan", age: 13, section: "8-A", parentMobile: "9876543215" },
];

const monthKey = (date: Date) =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

const dateOnly = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: { name: "Admin User", passwordHash, role: "ADMIN", status: "ACTIVE" },
    create: { name: "Admin User", email: "admin@example.com", passwordHash, role: "ADMIN", status: "ACTIVE" },
  });

  await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: { name: "Staff User", passwordHash, role: "STAFF", status: "ACTIVE" },
    create: { name: "Staff User", email: "staff@example.com", passwordHash, role: "STAFF", status: "ACTIVE" },
  });

  // SECTIONS still reads "10-A", which is now a class and a section. Split on
  // the dash so the seed keeps describing the school the familiar way.
  const sectionByLabel = new Map<string, number>();
  for (const label of SECTIONS) {
    const [className, sectionName = "A"] = label.split("-");
    const parent = await prisma.class.upsert({
      where: { name: className },
      update: {},
      create: { name: className },
    });
    const section = await prisma.section.upsert({
      where: { classId_name: { classId: parent.id, name: sectionName } },
      update: {},
      create: { classId: parent.id, name: sectionName },
    });
    sectionByLabel.set(label, section.id);
  }

  for (const student of STUDENTS) {
    const sectionId = sectionByLabel.get(student.section);
    if (!sectionId) throw new Error(`Missing section ${student.section}`);
    const details = {
      name: student.name,
      age: student.age,
      sectionId,
      parentMobile: student.parentMobile,
      fatherName: `${student.name.split(" ").slice(-1)[0]} Senior`,
      motherName: `${student.name.split(" ").slice(-1)[0]} Devi`,
      fatherMobile: student.parentMobile,
      motherMobile: student.parentMobile,
      address: `${student.rollNo} Demo Street, Chennai`,
      bloodGroup: BLOOD_GROUPS[student.rollNo.charCodeAt(student.rollNo.length - 1) % BLOOD_GROUPS.length],
      joiningDate: new Date(`${new Date().getFullYear()}-06-01`),
    };
    await prisma.student.upsert({
      where: { rollNo: student.rollNo },
      update: details,
      create: { rollNo: student.rollNo, ...details },
    });
  }

  const students = await prisma.student.findMany({ orderBy: { rollNo: "asc" } });
  const today = dateOnly(new Date());

  // 20 weekdays of attendance, mostly present with a sprinkle of late/absent.
  const rows: Array<{ studentId: number; date: Date; status: AttendanceStatus }> = [];
  let filled = 0;
  for (let back = 1; filled < 20; back += 1) {
    const day = new Date(today);
    day.setUTCDate(day.getUTCDate() - back);
    const weekday = day.getUTCDay();
    if (weekday === 0 || weekday === 6) continue;
    filled += 1;

    students.forEach((student, index) => {
      const slot = (filled + index) % 10;
      const status: AttendanceStatus = slot === 3 ? "ABSENT" : slot === 6 ? "LATE" : "PRESENT";
      rows.push({ studentId: student.id, date: new Date(day), status });
    });
  }

  await prisma.attendance.deleteMany({ where: { studentId: { in: students.map((s) => s.id) } } });
  await prisma.attendance.createMany({ data: rows });

  // Three months of tuition; the two older months are fully paid, the current
  // one partly. Then one of each other type, so every fee shape has demo data.
  const now = new Date();
  const months = [-2, -1, 0].map((offset) =>
    monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1))),
  );
  const year = String(now.getUTCFullYear());
  const quarter = `${year}-Q${Math.floor(now.getUTCMonth() / 3) + 1}`;
  const quarterMonth = `${year}-${String(Math.floor(now.getUTCMonth() / 3) * 3 + 1).padStart(2, "0")}`;
  const paidOn = (paid: boolean) => (paid ? new Date() : null);

  const monthlyFees = months.flatMap((period, monthIndex) =>
    students.map((student, index) => {
      const paid = monthIndex < 2 || index % 3 !== 0;
      return {
        studentId: student.id,
        feeType: "MONTHLY" as const,
        period,
        billedMonth: period,
        amount: "1500.00",
        paid,
        paidDate: paidOn(paid),
      };
    }),
  );

  const otherFees = students.flatMap((student, index) => [
    {
      studentId: student.id,
      feeType: "QUARTERLY" as const,
      period: quarter,
      billedMonth: quarterMonth,
      amount: "900.00",
      paid: index % 2 === 0,
      paidDate: paidOn(index % 2 === 0),
    },
    {
      studentId: student.id,
      feeType: "YEARLY" as const,
      period: year,
      billedMonth: `${year}-01`,
      amount: "6000.00",
      paid: index % 3 !== 0,
      paidDate: paidOn(index % 3 !== 0),
    },
    {
      studentId: student.id,
      feeType: "OTHER" as const,
      period: months[2],
      title: "Bus fee",
      billedMonth: months[2],
      amount: "700.00",
      paid: index % 2 === 1,
      paidDate: paidOn(index % 2 === 1),
    },
  ]);

  await prisma.fee.deleteMany({ where: { studentId: { in: students.map((s) => s.id) } } });
  await prisma.fee.createMany({ data: [...monthlyFees, ...otherFees] });

  console.log(`Seeded ${sectionByLabel.size} sections, ${students.length} students.`);
  console.log(`Seeded ${rows.length} attendance rows across 20 weekdays.`);
  console.log(
    `Seeded ${monthlyFees.length + otherFees.length} fees: monthly ${months.join(", ")}, ` +
      `quarterly ${quarter}, yearly ${year}, plus a bus fee.`,
  );
  console.log("Login: admin@example.com / password123  (or staff@example.com)");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
