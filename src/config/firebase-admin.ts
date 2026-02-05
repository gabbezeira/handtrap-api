import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
// In production, you can use Application Default Credentials or a service account key file
// For local development, use environment variables
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export const auth = admin.auth();
export const db = admin.firestore();
export default admin;
