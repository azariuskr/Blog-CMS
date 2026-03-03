import {
  type ErrorComponentProps,
  rootRouteId,
  useMatch,
} from "@tanstack/react-router";
import { UnauthorizedError } from "./errors/unauthorized-error";
import { ForbiddenError } from "./errors/forbidden-error";
import { NotFoundError } from "./errors/not-found-error";
import { MaintenanceError } from "./errors/maintenance-error";
import { GeneralError } from "./errors/general-error";

export function DefaultCatchBoundary({ error }: Readonly<ErrorComponentProps>) {
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  });

  console.error("Error caught by boundary:", error);

  const { status, message } = extractErrorInfo(error);

  switch (status) {
    case 401:
      return <UnauthorizedError message={message} />;
    case 403:
      return <ForbiddenError message={message} />;
    case 404:
      return <NotFoundError message={message} />;
    case 503:
      return <MaintenanceError message={message} />;
    default:
      return <GeneralError error={error} isRoot={isRoot} message={message} />;
  }
}

function extractErrorInfo(error: unknown): { status: number; message?: string } {
  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    "message" in error
  ) {
    return {
      status: Number(error.status),
      message: String(error.message),
    };
  }

  if (error instanceof Error) {
    return { status: 500, message: error.message };
  }

  return { status: 500 };
}
