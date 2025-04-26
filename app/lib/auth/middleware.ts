import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "./utils";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { users } from "../db/schema";

export async function authenticate(
  request: NextRequest
): Promise<{ userId: number } | null> {
  // Extraire le token du header Authorization
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  // Récupérer le token
  const token = authHeader.split(" ")[1];
  if (!token) {
    return null;
  }

  // Vérifier le token
  const payload = verifyToken(token);
  if (!payload) {
    return null;
  }

  // Vérifier que l'utilisateur existe toujours
  const user = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.id))
    .limit(1);
  if (user.length === 0) {
    return null;
  }

  return { userId: payload.id };
}

type RouteHandler = (
  request: NextRequest
) => Promise<NextResponse> | NextResponse;

export function withAuth(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest) => {
    const auth = await authenticate(request);

    if (!auth) {
      return NextResponse.json(
        { error: "Non autorisé", message: "Authentification requise" },
        { status: 401 }
      );
    }

    // Ajouter l'ID de l'utilisateur à la requête pour l'utiliser dans le handler
    request.headers.set("x-user-id", auth.userId.toString());

    return handler(request);
  };
}
