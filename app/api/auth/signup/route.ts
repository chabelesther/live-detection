import { NextRequest, NextResponse } from "next/server";
import { db } from "@/app/lib/db";
import { users } from "@/app/lib/db/schema";
import { hashPassword, generateToken } from "@/app/lib/auth/utils";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Récupérer les données du corps de la requête
    const body = await request.json();
    const { email, password, name } = body;

    // Validation des données
    if (!email || !password) {
      return NextResponse.json(
        { error: "Données invalides", message: "Email et mot de passe requis" },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email utilisé", message: "Cet email est déjà utilisé" },
        { status: 409 }
      );
    }

    // Hacher le mot de passe
    const hashedPassword = await hashPassword(password);

    // Créer l'utilisateur
    const result = await db
      .insert(users)
      .values({
        email,
        password: hashedPassword,
        name: name || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      });

    const newUser = result[0];

    // Générer un token
    const token = generateToken(newUser);

    // Retourner la réponse
    return NextResponse.json(
      {
        user: newUser,
        token,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erreur lors de l'inscription:", error);
    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: "Une erreur s'est produite lors de l'inscription",
      },
      { status: 500 }
    );
  }
}
