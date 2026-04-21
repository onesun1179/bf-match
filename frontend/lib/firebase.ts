import {getApps, initializeApp} from "firebase/app";
import {getMessaging, getToken, type Messaging, onMessage} from "firebase/messaging";

const env = import.meta.env as Record<string, string | undefined>;

// TODO: Firebase 프로젝트 생성 후 여기에 실제 값을 입력하세요
const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
  appId: env.VITE_FIREBASE_APP_ID ?? env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
};

const VAPID_KEY = env.VITE_FIREBASE_VAPID_KEY ?? env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? "";

function getFirebaseApp() {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

let messagingInstance: Messaging | null = null;

function getMessagingInstance(): Messaging | null {
  if (typeof window === "undefined") return null;
  if (!firebaseConfig.apiKey) return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(getFirebaseApp());
    } catch {
      return null;
    }
  }
  return messagingInstance;
}

export async function requestFcmToken(): Promise<string | null> {
  const messaging = getMessagingInstance();
  if (!messaging || !VAPID_KEY) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    return await getToken(messaging, { vapidKey: VAPID_KEY });
  } catch {
    return null;
  }
}

export function onFcmMessage(callback: (payload: { title?: string; body?: string }) => void) {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};
  return onMessage(messaging, (payload) => {
    callback({
      title: payload.notification?.title,
      body: payload.notification?.body,
    });
  });
}
