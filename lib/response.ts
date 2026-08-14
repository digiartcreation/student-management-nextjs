import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/lib/errors";
export const ok = <T>(data:T, message="OK", status=200) => NextResponse.json({success:true,message,data},{status});
export const paged = <T>(content:T[], page:number, size:number, totalElements:number) => ok({content,page,size,totalElements,totalPages:Math.ceil(totalElements/size)});
export function fail(error: unknown) { if (error instanceof ZodError) return NextResponse.json({success:false,message:"Validation failed",errors:error.flatten()},{status:400}); if(error instanceof AppError) return NextResponse.json({success:false,message:error.message,errors:error.errors??[]},{status:error.status}); console.error(error); return NextResponse.json({success:false,message:"Internal server error",errors:[]},{status:500}); }
export async function handle<T>(fn:()=>Promise<T>) { try{return ok(await fn());}catch(e){return fail(e);} }
export const noContent = () => new NextResponse(null, { status: 204 });
