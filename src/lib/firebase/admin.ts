import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

let adminApp: App | null = null;

function getServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
    const json = Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8");
    return JSON.parse(json) as Record<string, string>;
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    };
  }

  return null;
}

export function getAdminApp() {
  if (adminApp) return adminApp;
  if (getApps().length) {
    adminApp = getApps()[0] ?? null;
    return adminApp;
  }

  const serviceAccount = getServiceAccount();
  if (!serviceAccount) return null;

  adminApp = initializeApp({
    credential: cert(serviceAccount)
  });
  return adminApp;
}

export function getAdminDb() {
  const app = getAdminApp();
  return app ? getFirestore(app) : null;
}

export async function verifyFirebaseToken(token: string | null) {
  const app = getAdminApp();
  if (!app) {
    // In local development / offline mode where Firebase is not configured,
    // bypass authentication and return a mock decoded ID token structure.
    return {
      uid: "local-user",
      name: "Deepak Yadav",
      email: "deepak.yadav@gmail.com",
      auth_time: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      firebase: { sign_in_provider: "google.com", identities: {} },
      aud: "mock-aud",
      iss: "mock-iss",
      sub: "local-user"
    } as any;
  }
  if (!token) return null;
  try {
    return await getAuth(app).verifyIdToken(token);
  } catch {
    return null;
  }
}
