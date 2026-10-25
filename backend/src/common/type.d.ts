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

  interface SuccessResponse<T = unknown> {
    status: number;
    detail: string;
    data: T | null;
    page?: Pagination;
  }

  interface ErrorResponse {
    type: string;
    title: string;
    status: number;
    detail: string;
    code: string;
  }

  type ServiceResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

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

  interface ContainerSeed {
    containerNo: string;
    lineCode: LINE_CODE;
    sizeFt: number;
    status: string;
    dischargedAt: Date;
    activeHold: boolean;
  }
}

export {};
