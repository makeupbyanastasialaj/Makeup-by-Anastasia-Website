import { HttpRequest, HttpResponseInit, HttpHandler, InvocationContext, Cookie } from "@azure/functions";
import { SESSION_COOKIE, SESSION_MAX_AGE, verifySession } from "./auth";

export function json(status: number, body: unknown, extra?: Partial<HttpResponseInit>): HttpResponseInit {
  return { status, jsonBody: body, ...extra };
}

/**
 * Wrap a handler so any thrown error becomes a JSON 500 instead of an empty
 * body. Without this, an unhandled exception surfaces to the client as a blank
 * response, which is impossible to diagnose from the browser.
 */
export function safe(fn: HttpHandler): HttpHandler {
  return async (request: HttpRequest, context: InvocationContext) => {
    try {
      return await fn(request, context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      context.error("Unhandled error handling", request.method, request.url, err);
      return json(500, { error: message });
    }
  };
}

export function ok(body: unknown, extra?: Partial<HttpResponseInit>): HttpResponseInit {
  return json(200, body, extra);
}

export function badRequest(error: string): HttpResponseInit {
  return json(400, { error });
}

export function unauthorized(): HttpResponseInit {
  return json(401, { error: "Not authorized" });
}

/** Read a cookie value from the request. */
export function getCookie(request: HttpRequest, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

const isProd = () => process.env.NODE_ENV === "production" || !!process.env.WEBSITE_HOSTNAME;

export function sessionCookie(token: string): Cookie {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: isProd(),
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export function clearSessionCookie(): Cookie {
  return {
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: isProd(),
    sameSite: "Lax",
    path: "/",
    maxAge: 0,
  };
}

/** True when the request carries a valid admin session. */
export async function isAdmin(request: HttpRequest): Promise<boolean> {
  return verifySession(getCookie(request, SESSION_COOKIE));
}

export async function parseBody<T>(request: HttpRequest): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
