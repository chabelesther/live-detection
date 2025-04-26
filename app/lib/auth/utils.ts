import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../db/schema";

// S'assurer que la clé secrète JWT est définie
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// Nombre de tours pour le hachage du mot de passe
const SALT_ROUNDS = 10;

// Hacher un mot de passe
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Vérifier un mot de passe
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Générer un token JWT
export function generateToken(user: Omit<User, "password">): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET!,
    { expiresIn: "7d" }
  );
}

// Vérifier un token JWT
export function verifyToken(
  token: string
): { id: number; email: string } | null {
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as {
      id: number;
      email: string;
    };
  } catch {
    return null;
  }
}
