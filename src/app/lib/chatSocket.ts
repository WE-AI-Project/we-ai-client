import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { buildApiUrl, loadSession, refreshSession } from "./api";

let client: Client | null = null;

function getSocketUrl(): string {
  return buildApiUrl("/ws");
}

export function connectChatSocket(onConnectError?: (err: unknown) => void): Client {
  if (client && client.active) return client;

  client = new Client({
    webSocketFactory: () => new SockJS(getSocketUrl()) as any,
    connectHeaders: {
      Authorization: `Bearer ${loadSession()?.accessToken ?? ""}`,
    },
    reconnectDelay: 5000,
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
  return activeClient.subscribe(`/topic/projects/${projectId}/chat-rooms/${chatRoomId}`, (message: IMessage) => {
    try {
      onMessage(JSON.parse(message.body));
    } catch {
      // 파싱 실패한 메시지는 무시
    }
  });
}

export function disconnectChatSocket() {
  client?.deactivate();
  client = null;
}
