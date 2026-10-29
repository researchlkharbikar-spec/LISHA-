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
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

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

// Test initial connection
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline or awaiting network.');
    }
    return false;
  }
}

// Google Sign-In with Popup
export async function signInWithGoogle(): Promise<User> {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
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
  try {
    await setDoc(doc(db, 'analyses', record.id), record);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getUserAnalyses(userId: string): Promise<SavedAnalysis[]> {
  const path = 'analyses';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as SavedAnalysis);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteAnalysisRecord(id: string): Promise<void> {
  const path = `analyses/${id}`;
  try {
    await deleteDoc(doc(db, 'analyses', id));
  } catch (err) {
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
    await setDoc(doc(db, 'bookmarks', bookmark.id), bookmark);
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function getUserBookmarks(userId: string): Promise<SavedBookmark[]> {
  const path = 'bookmarks';
  try {
    const q = query(collection(db, path), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => d.data() as SavedBookmark);
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export async function deleteBookmark(id: string): Promise<void> {
  const path = `bookmarks/${id}`;
  try {
    await deleteDoc(doc(db, 'bookmarks', id));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}
