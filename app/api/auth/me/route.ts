import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { users } from "@/app/lib/db/schema";
import { eq } from "drizzle-orm";
import { withAuth } from "@/app/lib/auth/middleware";

async function handler(request: NextRequest) {
  // Récupérer l'ID de l'utilisateur à partir du header (ajouté par le middleware)
  const userId = parseInt(request.headers.get("x-user-id") || "0", 10);

  if (!userId) {
    return NextResponse.json(
      { error: "Non autorisé", message: "Authentification requise" },
      { status: 401 }
    );
  }

  try {
    // Récupérer l'utilisateur depuis la base de données
    const userResults = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userResults.length === 0) {
      return NextResponse.json(
        { error: "Non trouvé", message: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Retourner les informations de l'utilisateur
    return NextResponse.json({
      user: userResults[0],
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du profil:", error);
    return NextResponse.json(
      { error: "Erreur serveur", message: "Une erreur s'est produite" },
      { status: 500 }
    );
  }
}

// Utiliser le middleware d'authentification
export const GET = withAuth(handler);
