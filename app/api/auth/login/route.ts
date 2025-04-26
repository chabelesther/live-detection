import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { users } from "@/app/lib/db/schema";
import { verifyPassword, generateToken } from "@/app/lib/auth/utils";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du corps de la requête
    const body = await request.json();
    const { email, password } = body;

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { error: "Données invalides", message: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur par email
    const userResults = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userResults.length === 0) {
      return NextResponse.json(
        { error: "Non trouvé", message: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    const user = userResults[0];

    // Vérifier le mot de passe
    const isPasswordValid = await verifyPassword(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Non autorisé", message: "Email ou mot de passe incorrect" },
        { status: 401 }
      );
    }

    // Générer un token
    const userWithoutPassword = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
    const token = generateToken(userWithoutPassword);

    // Retourner la réponse
    return NextResponse.json({
      user: userWithoutPassword,
      token,
    });
  } catch (error) {
    console.error("Erreur lors de la connexion:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: "Une erreur s'est produite lors de la connexion",
      },
      { status: 500 }
    );
  }
}
