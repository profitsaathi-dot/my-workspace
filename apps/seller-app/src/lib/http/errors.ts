/**
 * Typed error classes used by the HTTP layer and the API route handlers.
 * Route handlers convert these into NextResponse with the right status code.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized") {
    super(401, message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden") {
    super(403, message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message);
    this.name = "NotFoundError";
  }
}

export class BadRequestError extends ApiError {
  constructor(message = "Bad request") {
    super(400, message);
    this.name = "BadRequestError";
  }
}

export function toApiResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.name, message: err.message, body: err.body },
      { status: err.status }
    );
  }
  console.error("Unhandled API error:", err);
  return Response.json(
    { error: "InternalServerError", message: "Internal server error" },
    { status: 500 }
  );
}
