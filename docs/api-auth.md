# Documentation API d'Authentification

Ce document décrit les endpoints d'API disponibles pour l'authentification des utilisateurs de l'application mobile.

## Configuration requise

L'API utilise un mécanisme d'authentification JWT. Pour toutes les requêtes nécessitant une authentification, le token JWT doit être inclus dans l'en-tête HTTP comme suit:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Endpoints

### URL de base `https://live-detection-five.vercel.app/`

### Inscription (Sign Up)

- **URL**: `/api/auth/signup`
- **Méthode**: `POST`
- **Authentification**: Non
- **Corps de la requête**:
  ```json
  {
    "email": "utilisateur@exemple.com",
    "password": "motDePasse123",
    "name": "John Doe" // Optionnel
  }
  ```
- **Réponse réussie**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "utilisateur@exemple.com",
      "name": "John Doe",
      "createdAt": "2023-11-11T14:30:00.000Z",
      "updatedAt": "2023-11-11T14:30:00.000Z"
    },
    "token": "jwt_token_here"
  }
  ```
- **Codes de statut**:
  - `201 Created`: Utilisateur créé avec succès
  - `400 Bad Request`: Données invalides
  - `409 Conflict`: Email déjà utilisé
  - `500 Internal Server Error`: Erreur serveur

### Connexion (Login)

- **URL**: `/api/auth/login`
- **Méthode**: `POST`
- **Authentification**: Non
- **Corps de la requête**:
  ```json
  {
    "email": "utilisateur@exemple.com",
    "password": "motDePasse123"
  }
  ```
- **Réponse réussie**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "utilisateur@exemple.com",
      "name": "John Doe",
      "createdAt": "2023-11-11T14:30:00.000Z",
      "updatedAt": "2023-11-11T14:30:00.000Z"
    },
    "token": "jwt_token_here"
  }
  ```
- **Codes de statut**:
  - `200 OK`: Connexion réussie
  - `400 Bad Request`: Données invalides
  - `401 Unauthorized`: Email ou mot de passe incorrect
  - `500 Internal Server Error`: Erreur serveur

### Profil Utilisateur (Vérifier l'état d'authentification)

- **URL**: `/api/auth/me`
- **Méthode**: `GET`
- **Authentification**: Oui (token JWT requis)
- **Réponse réussie**:
  ```json
  {
    "user": {
      "id": 1,
      "email": "utilisateur@exemple.com",
      "name": "John Doe",
      "createdAt": "2023-11-11T14:30:00.000Z",
      "updatedAt": "2023-11-11T14:30:00.000Z"
    }
  }
  ```
- **Codes de statut**:
  - `200 OK`: Profil récupéré avec succès
  - `401 Unauthorized`: Token manquant ou invalide
  - `404 Not Found`: Utilisateur non trouvé
  - `500 Internal Server Error`: Erreur serveur

## Exemple d'utilisation en JavaScript/TypeScript

```typescript
// Inscription
async function signup(email: string, password: string, name?: string) {
  const response = await fetch(
    "https://live-detection-five.vercel.app/api/auth/signup",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password, name }),
    }
  );

  return await response.json();
}

// Connexion
async function login(email: string, password: string) {
  const response = await fetch(
    "https://live-detection-five.vercel.app/api/auth/login",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
    }
  );

  return await response.json();
}

// Récupérer le profil
async function getProfile(token: string) {
  const response = await fetch(
    "https://live-detection-five.vercel.app/api/auth/me",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return await response.json();
}
```
