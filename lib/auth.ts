import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";
import type { UserRole } from "@prisma/client";
const key=()=>new TextEncoder().encode(process.env.JWT_SECRET || "development-only-change-me");
export const AUTH_COOKIE="student_fee_session";
export async function signSession(user:{id:number;role:UserRole}) { return new SignJWT({role:user.role}).setProtectedHeader({alg:"HS256"}).setSubject(String(user.id)).setIssuedAt().setExpirationTime("8h").sign(key()); }
export async function requireAuth() { const token=(await cookies()).get(AUTH_COOKIE)?.value; if(!token) throw new UnauthorizedError(); try { const {payload}=await jwtVerify(token,key()); const user=await prisma.user.findUnique({where:{id:Number(payload.sub)}}); if(!user||user.status!=="ACTIVE") throw new UnauthorizedError(); return user; } catch(e) { if(e instanceof UnauthorizedError) throw e; throw new UnauthorizedError("Invalid or expired session"); } }
export async function requireRole(...roles:UserRole[]) { const user=await requireAuth(); if(!roles.includes(user.role)) throw new ForbiddenError(); return user; }
export const sessionCookie=(token:string)=>({name:AUTH_COOKIE,value:token,httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax" as const,path:"/",maxAge:60*60*8});
