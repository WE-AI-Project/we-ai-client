import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { buildApiUrl, loadSession, refreshSession } from "./api";

let client: Client | null = null;

type RoomEntry = {
  projectId: number;
  chatRoomId: number;
  onMessage: (payload: any) => void;
  subscription: StompSubscription | null;
};

const roomEntries = new Map<string, RoomEntry>();

type NotificationEntry = {
  projectId: number;
  userId: number;
  onMessage: (payload: any) => void;
  subscription: StompSubscription | null;
};

const notificationEntries = new Map<string, NotificationEntry>();

function roomKey(projectId: number, chatRoomId: number): string {
  return `${projectId}:${chatRoomId}`;
}

function notificationKey(projectId: number, userId: number): string {
  return `notif:${projectId}:${userId}`;
}

function getSocketUrl(): string {
  return buildApiUrl("/ws");
}

function subscribeEntry(activeClient: Client, entry: RoomEntry) {
  entry.subscription = activeClient.subscribe(
    `/topic/projects/${entry.projectId}/chat-rooms/${entry.chatRoomId}`,
    (message: IMessage) => {
      try {
        entry.onMessage(JSON.parse(message.body));
      } catch {
        // 파싱 실패한 메시지는 무시
      }
    }
  );
}

function subscribeNotificationEntry(activeClient: Client, entry: NotificationEntry) {
  entry.subscription = activeClient.subscribe(
    `/topic/projects/${entry.projectId}/notifications/${entry.userId}`,
    (message: IMessage) => {
      try {
        entry.onMessage(JSON.parse(message.body));
      } catch {
        // 파싱 실패한 메시지는 무시
      }
    }
  );
}

function resubscribeAll(activeClient: Client) {
  for (const entry of roomEntries.values()) {
    entry.subscription = null;
    subscribeEntry(activeClient, entry);
  }
  for (const entry of notificationEntries.values()) {
    entry.subscription = null;
    subscribeNotificationEntry(activeClient, entry);
  }
}

export function connectChatSocket(onConnectError?: (err: unknown) => void): Client {
  if (client && client.active) return client;

  client = new Client({
    webSocketFactory: () => new SockJS(getSocketUrl()) as any,
    connectHeaders: {
      Authorization: `Bearer ${loadSession()?.accessToken ?? ""}`,
    },
    reconnectDelay: 5000,
    onConnect: () => {
      if (client) resubscribeAll(client);
    },
    onStompError: (frame) => {
      const isAuthError = frame.headers?.message?.toLowerCase().includes("auth") ?? false;
      if (isAuthError) {
        refreshSession()
          .then(() => {
            client?.deactivate();
            client = null;
            connectChatSocket(onConnectError);
          })
          .catch((err) => onConnectError?.(err));
      } else {
        onConnectError?.(frame);
      }
    },
  });

  client.activate();
  return client;
}

export function subscribeToRoom(
  projectId: number,
  chatRoomId: number,
  onMessage: (payload: any) => void
): StompSubscription {
  const activeClient = connectChatSocket();
  const key = roomKey(projectId, chatRoomId);

  const entry: RoomEntry = { projectId, chatRoomId, onMessage, subscription: null };
  roomEntries.set(key, entry);

  if (activeClient.connected) {
    subscribeEntry(activeClient, entry);
  }
  // 아직 연결 전이면 onConnect 시점에 resubscribeAll()이 구독을 걸어준다.

  return {
    id: `chat-room-${key}`,
    unsubscribe: () => {
      entry.subscription?.unsubscribe();
      roomEntries.delete(key);
    },
  };
}

export function subscribeToProjectNotifications(
  projectId: number,
  userId: number,
  onMessage: (payload: any) => void
): StompSubscription {
  const activeClient = connectChatSocket();
  const key = notificationKey(projectId, userId);

  const entry: NotificationEntry = { projectId, userId, onMessage, subscription: null };
  notificationEntries.set(key, entry);

  if (activeClient.connected) {
    subscribeNotificationEntry(activeClient, entry);
  }
  // 아직 연결 전이면 onConnect 시점에 resubscribeAll()이 구독을 걸어준다.

  return {
    id: `notification-${key}`,
    unsubscribe: () => {
      entry.subscription?.unsubscribe();
      notificationEntries.delete(key);
    },
  };
}

export function disconnectChatSocket() {
  roomEntries.clear();
  notificationEntries.clear();
  client?.deactivate();
  client = null;
}
