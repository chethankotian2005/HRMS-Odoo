import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { can, Action, ResourceContext, UserContext } from "./policy";

type ApiHandler = (req: Request, context: any, user: UserContext) => Promise<NextResponse> | NextResponse;
type ResourceContextResolver = (req: Request, context: any) => Promise<ResourceContext> | ResourceContext;

/**
 * A higher-order function to wrap Next.js App Router API handlers.
 * It enforces RBAC policies centrally and returns 403 JSON on failure.
 */
export function withAuth(
  action: Action,
  getResourceContext: ResourceContextResolver,
  handler: ApiHandler
) {
  return async (req: Request, context: any) => {
    try {
      const session = await getServerSession(authOptions);

      if (!session || !session.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = session.user as UserContext;

      // Resolve the resource context (e.g. figure out who owns the record being requested)
      const resourceContext = await getResourceContext(req, context);

      // Enforce the central policy
      if (!can(user, action, resourceContext)) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to perform this action." },
          { status: 403 }
        );
      }

      // If authorized, proceed to the actual handler
      return await handler(req, context, user);
    } catch (error) {
      console.error("[RBAC Wrapper Error]", error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
