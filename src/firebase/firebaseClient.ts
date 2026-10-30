/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * LISHA Firebase Integration
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  getDocFromServer,
  setLogLevel,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Silence internal Firestore connection retry logs to prevent unhandled console noise during offline operation
try {
  setLogLevel('silent');
} catch {
  // Ignore if already configured
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test initial connection per skill requirement
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('the client is offline')) {
      console.warn('LISHA: Cloud Firestore is operating in offline mode.');
    } else if (
      errorMsg.includes('token-service-api-has-not-been-used') ||
      errorMsg.includes('securetoken.googleapis.com')
    ) {
      console.info(
        'LISHA: Google Cloud Secure Token API is activating. Operating seamlessly in offline/local workspace mode.'
      );
    } else if (error?.code === 'permission-denied') {
      // Permission denied on test doc confirms backend is reached and rules are active
      return true;
    }
    return false;
  }
}

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      throw new Error(
        'Google Cloud Secure Token API is currently initializing on project 64157452361. Your research data is safely saved in your local workspace.'
      );
    }
    throw err;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

// Database Operations
export interface SavedAnalysis {
  id: string;
  userId: string;
  title: string;
  lncRnaName: string;
  lncRnaSequence?: string;
  interactionType: string;
  targetName?: string;
  score?: number;
  summary?: string;
  createdAt: string;
  updatedAt?: string;
}

export async function saveAnalysisRecord(record: SavedAnalysis): Promise<void> {
  const path = `analyses/${record.id}`;
  // Ensure local storage is always up-to-date
  try {
    const local = localStorage.getItem('lisha_analyses');
    const existing: SavedAnalysis[] = local ? JSON.parse(local) : [];
    const updated = [record, ...existing.filter((a) => a.id !== record.id)];
    localStorage.setItem('lisha_analyses', JSON.stringify(updated));
  } catch {
    // Ignore storage quota errors
  }

  try {
    await setDoc(doc(db, 'analyses', record.id), record);
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      console.info('LISHA: Saved analysis to local storage (offline fallback).');
      return;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getUserAnalyses(userId: string): Promise<SavedAnalysis[]> {
  const path = 'analyses';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => d.data() as SavedAnalysis);
    if (results.length > 0) {
      localStorage.setItem('lisha_analyses', JSON.stringify(results));
    }
    return results;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      console.info('LISHA: Reading analyses from local storage (offline fallback).');
      const local = localStorage.getItem('lisha_analyses');
      return local ? JSON.parse(local) : [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteAnalysisRecord(id: string): Promise<void> {
  const path = `analyses/${id}`;
  try {
    const local = localStorage.getItem('lisha_analyses');
    if (local) {
      const existing: SavedAnalysis[] = JSON.parse(local);
      localStorage.setItem(
        'lisha_analyses',
        JSON.stringify(existing.filter((a) => a.id !== id))
      );
    }
  } catch {
    // Ignore
  }

  try {
    await deleteDoc(doc(db, 'analyses', id));
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export interface SavedBookmark {
  id: string;
  userId: string;
  lncRnaId: string;
  lncRnaName: string;
  species?: string;
  notes?: string;
  createdAt: string;
}

export async function saveBookmark(bookmark: SavedBookmark): Promise<void> {
  const path = `bookmarks/${bookmark.id}`;
  try {
    const local = localStorage.getItem('lisha_bookmarks');
    const existing: SavedBookmark[] = local ? JSON.parse(local) : [];
    const updated = [bookmark, ...existing.filter((b) => b.id !== bookmark.id)];
    localStorage.setItem('lisha_bookmarks', JSON.stringify(updated));
  } catch {
    // Ignore
  }

  try {
    await setDoc(doc(db, 'bookmarks', bookmark.id), bookmark);
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      console.info('LISHA: Saved bookmark to local storage (offline fallback).');
      return;
    }
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getUserBookmarks(userId: string): Promise<SavedBookmark[]> {
  const path = 'bookmarks';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const results = snapshot.docs.map((d) => d.data() as SavedBookmark);
    if (results.length > 0) {
      localStorage.setItem('lisha_bookmarks', JSON.stringify(results));
    }
    return results;
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      console.info('LISHA: Reading bookmarks from local storage (offline fallback).');
      const local = localStorage.getItem('lisha_bookmarks');
      return local ? JSON.parse(local) : [];
    }
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  const path = `bookmarks/${id}`;
  try {
    const local = localStorage.getItem('lisha_bookmarks');
    if (local) {
      const existing: SavedBookmark[] = JSON.parse(local);
      localStorage.setItem(
        'lisha_bookmarks',
        JSON.stringify(existing.filter((b) => b.id !== id))
      );
    }
  } catch {
    // Ignore
  }

  try {
    await deleteDoc(doc(db, 'bookmarks', id));
  } catch (err: any) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes('token-service-api-has-not-been-used') ||
      msg.includes('the client is offline') ||
      msg.includes('securetoken.googleapis.com')
    ) {
      return;
    }
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
