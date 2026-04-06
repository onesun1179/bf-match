/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js");

// Firebase 프로젝트 생성 후 실제 값으로 교체하세요
firebase.initializeApp({
  apiKey: "AIzaSyC4E1UGJjPTMlSzGxdC3Y8eZ3AjfhwTAHQ",
  authDomain: "bf-match.firebaseapp.com",
  projectId: "bf-match",
  storageBucket: "bf-match.firebasestorage.app",
  messagingSenderId: "416159789900",
  appId: "1:416159789900:web:064764b5af6c3e6db015e9",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title ?? "BF Match";
  const body = payload.notification?.body ?? "";
  const data = payload.data ?? {};
  self.registration.showNotification(title, {
    body,
    icon: "/icon-192.png",
    data,
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data;
  let url = "/";
  if (data?.targetType === "GROUP" && data?.targetId) {
    url = `/groups/${data.targetId}`;
  }
  event.waitUntil(clients.openWindow(url));
});
