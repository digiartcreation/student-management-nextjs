import { BLOOD_GROUPS, ClassPayload, FeePayload, SectionPayload, StudentPayload } from '../models/app.models';

/**
 * Per-field messages, keyed by the form field they belong to. Empty means valid.
 *
 * These rules deliberately mirror the zod schemas on the server rather than
 * replacing them: the API stays the authority and rejects anything bad whatever
 * the client does, but repeating the rules here means a typo is caught next to
 * the field instead of coming back as one line in a toast.
 */
export type FieldErrors = Record<string, string>;

export const MOBILE_RE = /^\+?[0-9]{10,15}$/;
const PERSON_NAME_RE = /^[\p{L}][\p{L}\s.'-]*$/u;
const ROLL_NO_RE = /^[A-Za-z0-9/-]+$/;
const SIMPLE_NAME_RE = /^[A-Za-z0-9 -]+$/;

const text = (value: unknown): string => String(value ?? '').trim();

export const isBlank = (value: unknown): boolean => text(value).length === 0;

/** First failing rule wins, so a field never shows two complaints at once. */
const check = (
  rules: Array<[boolean, string]>,
): string | null => rules.find(([failed]) => failed)?.[1] ?? null;

const personName = (value: unknown, label: string): string | null =>
  check([
    [isBlank(value), `${label} is required`],
    [text(value).length < 2, `${label} must be at least 2 characters`],
    [text(value).length > 120, `${label} must be at most 120 characters`],
    [!PERSON_NAME_RE.test(text(value)), `${label} may only contain letters, spaces, . ' and -`],
  ]);

const mobile = (value: unknown, label: string): string | null =>
  check([
    [isBlank(value), `${label} is required`],
    [!MOBILE_RE.test(text(value)), `${label} must be 10-15 digits`],
  ]);

const assign = (errors: FieldErrors, field: string, message: string | null): void => {
  if (message) errors[field] = message;
};

export function validateStudent(form: Partial<StudentPayload>): FieldErrors {
  const errors: FieldErrors = {};

  assign(errors, 'rollNo', check([
    [isBlank(form.rollNo), 'Roll number is required'],
    [text(form.rollNo).length > 30, 'Roll number must be at most 30 characters'],
    [!ROLL_NO_RE.test(text(form.rollNo)), 'Roll number may only contain letters, numbers, - and /'],
  ]));

  assign(errors, 'name', personName(form.name, 'Name'));
  assign(errors, 'fatherName', personName(form.fatherName, "Father's name"));
  assign(errors, 'motherName', personName(form.motherName, "Mother's name"));

  assign(errors, 'parentMobile', mobile(form.parentMobile, 'Parent mobile'));
  assign(errors, 'fatherMobile', mobile(form.fatherMobile, "Father's mobile"));
  assign(errors, 'motherMobile', mobile(form.motherMobile, "Mother's mobile"));

  const age = Number(form.age);
  assign(errors, 'age', check([
    [form.age === null || form.age === undefined || String(form.age) === '', 'Age is required'],
    [Number.isNaN(age), 'Age must be a number'],
    [!Number.isInteger(age), 'Age must be a whole number'],
    [age < 3, 'Age must be at least 3'],
    [age > 30, 'Age must be at most 30'],
  ]));

  assign(errors, 'sectionId', check([[!Number(form.sectionId), 'Section is required']]));

  assign(errors, 'address', check([
    [isBlank(form.address), 'Address is required'],
    [text(form.address).length < 5, 'Address must be at least 5 characters'],
    [text(form.address).length > 500, 'Address must be at most 500 characters'],
  ]));

  assign(errors, 'bloodGroup', check([
    [isBlank(form.bloodGroup), 'Blood group is required'],
    [
      !isBlank(form.bloodGroup) && !BLOOD_GROUPS.includes(text(form.bloodGroup) as never),
      `Blood group must be one of ${BLOOD_GROUPS.join(', ')}`,
    ],
  ]));

  // Compared date-only: a joining date recorded today is valid even though the
  // parsed midnight is technically earlier than "now".
  const joining = text(form.joiningDate);
  const parsed = joining ? new Date(joining) : null;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  assign(errors, 'joiningDate', check([
    [isBlank(form.joiningDate), 'Joining date is required'],
    [!!parsed && Number.isNaN(parsed.getTime()), 'Joining date must be a valid date'],
    [!!parsed && !Number.isNaN(parsed.getTime()) && parsed > endOfToday, 'Joining date cannot be in the future'],
  ]));

  return errors;
}

export function validateClass(form: Partial<ClassPayload>): FieldErrors {
  const errors: FieldErrors = {};
  assign(errors, 'name', check([
    [isBlank(form.name), 'Class name is required'],
    [text(form.name).length > 30, 'Class name must be at most 30 characters'],
    [!SIMPLE_NAME_RE.test(text(form.name)), 'Class name may only contain letters, numbers, spaces and -'],
  ]));
  return errors;
}

export function validateSection(form: Partial<SectionPayload>): FieldErrors {
  const errors: FieldErrors = {};
  assign(errors, 'classId', check([[!Number(form.classId), 'Class is required']]));
  assign(errors, 'name', check([
    [isBlank(form.name), 'Section name is required'],
    [text(form.name).length > 20, 'Section name must be at most 20 characters'],
    [!SIMPLE_NAME_RE.test(text(form.name)), 'Section name may only contain letters, numbers, spaces and -'],
  ]));
  return errors;
}

export function validateFee(form: Partial<FeePayload> & { period?: string }): FieldErrors {
  const errors: FieldErrors = {};
  assign(errors, 'studentId', check([[!Number(form.studentId), 'Student is required']]));
  assign(errors, 'period', check([[isBlank(form.period), 'Period is required']]));

  const amount = Number(form.amount);
  assign(errors, 'amount', check([
    [form.amount === null || form.amount === undefined || String(form.amount) === '', 'Amount is required'],
    [Number.isNaN(amount), 'Amount must be a number'],
    [amount < 0, 'Amount cannot be negative'],
    [amount > 10_000_000, 'Amount looks too large'],
  ]));

  // Only `OTHER` carries a title, and it is what distinguishes one one-off
  // charge from another in the same month, so it cannot be blank there.
  if (form.feeType === 'OTHER') {
    assign(errors, 'title', check([
      [isBlank(form.title), 'Name the charge, e.g. Bus fee'],
      [text(form.title).length > 60, 'Title must be at most 60 characters'],
    ]));
  }

  return errors;
}

export const hasErrors = (errors: FieldErrors): boolean => Object.keys(errors).length > 0;

/** The first message, for the summary toast shown alongside the inline errors. */
export const firstError = (errors: FieldErrors): string => Object.values(errors)[0] ?? '';
