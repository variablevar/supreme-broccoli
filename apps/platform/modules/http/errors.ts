import { NextResponse } from "next/server";
export function dbError(error: { code?: string; message: string }) {
  const status =
    error.code === "P0002"
      ? 404
      : error.code === "23505"
        ? 409
        : error.code === "22023"
          ? 400
          : 500;
  if (status === 500)
    console.error("Database operation failed", { code: error.code });
  return NextResponse.json(
    {
      error:
        status === 500
          ? "Service unavailable. Please try again."
          : status === 409
            ? "This operation conflicts with an existing request."
            : error.message,
    },
    { status },
  );
}
export const invalid = () =>
  NextResponse.json(
    { error: "Invalid request. Check the fields and try again." },
    { status: 400 },
  );
