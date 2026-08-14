import { Prisma } from "@prisma/client";

export const decimal = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);
export const zeroDecimal = () => decimal(0);
export const add = (...values: Prisma.Decimal.Value[]) =>
  values.reduce((acc, value) => decimal(acc).add(decimal(value)), zeroDecimal());
export const subtract = (a: Prisma.Decimal.Value, b: Prisma.Decimal.Value) => decimal(a).sub(decimal(b));
export const minDecimal = (a: Prisma.Decimal.Value, b: Prisma.Decimal.Value) =>
  decimal(a).lessThan(decimal(b)) ? decimal(a) : decimal(b);
export const maxDecimal = (a: Prisma.Decimal.Value, b: Prisma.Decimal.Value) =>
  decimal(a).greaterThan(decimal(b)) ? decimal(a) : decimal(b);
export const isNegative = (value: Prisma.Decimal.Value) => decimal(value).lessThan(0);
export const isPositive = (value: Prisma.Decimal.Value) => decimal(value).greaterThan(0);
export const isZero = (value: Prisma.Decimal.Value) => decimal(value).equals(0);
