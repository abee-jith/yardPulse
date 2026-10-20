declare global {
  namespace Express {
    interface Request {
      user?: ReqUser;
    }
  }

  interface ReqUser {
    id: number;
    fullName: string;
    role: string;
    lineCode: string | null;
  }

  interface Pagination {
    limit: number;
    next_cursor: string | null;
  }

  interface ServiceResponse<T = unknown> {
    status: number;
    message: string;
    data: T | null;
  }

  interface ServiceResponseWithCount<T = unknown> {
    status: number;
    message: string;
    data: T | null;
    page?: Pagination;
  }

  interface DriveError {
    code?: string;
    detail?: string;
    table?: string;
  }

  interface AccessTokenPayload {
    id: number;
    fullName: string;
    role: string;
    lineCode: string | null;
  }
}

export {};
