import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/terms(.*)",
  "/privacy(.*)",
  "/tokushoho(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/subscribe(.*)",
  "/payment-pending(.*)",
  "/api/webhooks(.*)",
  "/opengraph-image",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
