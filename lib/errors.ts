export class AppError extends Error { constructor(public status:number, message:string, public errors?: unknown) { super(message); } }
export class UnauthorizedError extends AppError { constructor(message="Authentication required") { super(401,message); } }
export class ForbiddenError extends AppError { constructor(message="Forbidden") { super(403,message); } }
export class NotFoundError extends AppError { constructor(message="Resource not found") { super(404,message); } }
export class ConflictError extends AppError { constructor(message:string) { super(409,message); } }
export class BusinessError extends AppError { constructor(message:string) { super(422,message); } }
export class DatabaseError extends AppError { constructor(message="Database operation failed") { super(500, message); } }
