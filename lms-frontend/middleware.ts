import { NextResponse, type NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "lms_session";
const ROLE_COOKIE_NAME = "lumina_role";

const AUTH_REQUIRED_ROUTES = [
  "/cart",
  "/checkout",
  "/orders",
  "/payment-result",
  "/my-courses",
  "/certificates",
  "/wishlist",
  "/profile",
  "/settings",
  "/notifications",
];

function isExactRoute(pathname: string, routes: string[]) {
  return routes.includes(pathname);
}

function isRoutePrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(loginUrl);
}

function rewriteToNotFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  const role = request.cookies.get(ROLE_COOKIE_NAME)?.value;

  if (isRoutePrefix(pathname, "/admin")) {
    if (!hasSession) {
      return rewriteToNotFound(request);
    }

    if (role !== "admin") {
      return rewriteToNotFound(request);
    }

    return NextResponse.next();
  }

  if (isRoutePrefix(pathname, "/instructor")) {
    if (!hasSession) {
      return redirectToLogin(request);
    }

    if (role !== "instructor" && role !== "admin") {
      return NextResponse.redirect(new URL("/become-instructor", request.url));
    }

    return NextResponse.next();
  }

  if (
    isExactRoute(pathname, AUTH_REQUIRED_ROUTES)
    || isRoutePrefix(pathname, "/learn")
    || isRoutePrefix(pathname, "/quiz")
  ) {
    if (!hasSession) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/cart",
    "/checkout",
    "/orders",
    "/payment-result",
    "/my-courses",
    "/certificates",
    "/wishlist",
    "/profile",
    "/settings",
    "/notifications",
    "/learn/:path*",
    "/quiz/:path*",
  ],
};
