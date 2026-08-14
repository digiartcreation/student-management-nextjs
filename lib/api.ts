import { NextRequest } from "next/server";
import { z } from "zod";
import { fail } from "@/lib/response";
export async function body<T extends z.ZodTypeAny>(request: NextRequest, schema: T): Promise<z.infer<T>> {
  return schema.parse(await request.json());
}
export function query(request:NextRequest){ const p=request.nextUrl.searchParams; const page=Math.max(0,Number(p.get("page")??0)||0),size=Math.min(100,Math.max(1,Number(p.get("size")??20)||20)); return {page,size,skip:page*size}; }
export function route<T extends unknown[]>(fn:(...a:T)=>Promise<Response>){return async (...a:T)=>{try{return await fn(...a)}catch(e){return fail(e)}}}
export const toOptionalNumber = (value: string | null) => (value ? Number(value) : undefined);
export const toOptionalDate = (value: string | null) => (value ? new Date(value) : undefined);
export const toOptionalString = (value: string | null) => value ?? undefined;
