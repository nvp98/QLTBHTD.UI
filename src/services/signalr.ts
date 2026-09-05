import * as signalR from '@microsoft/signalr';

const BASE_URL = (import.meta.env.VITE_API_URL as string) ?? 'http://localhost:5180';
const AUTH_TOKEN_KEY = 'cbm_auth_token';

let connection: signalR.HubConnection | null = null;

/** Bắt đầu kết nối SignalR tới hub thông báo — gọi sau khi đã đăng nhập (có token). Idempotent:
 * gọi nhiều lần chỉ tạo 1 connection duy nhất. */
export function startNotificationConnection(): signalR.HubConnection {
  if (connection) return connection;

  connection = new signalR.HubConnectionBuilder()
    .withUrl(`${BASE_URL}/hubs/notifications`, {
      accessTokenFactory: () => localStorage.getItem(AUTH_TOKEN_KEY) ?? '',
    })
    .withAutomaticReconnect()
    .build();

  connection.start().catch(err => console.error('SignalR: lỗi kết nối', err));
  return connection;
}

export function stopNotificationConnection(): void {
  connection?.stop();
  connection = null;
}

export function getNotificationConnection(): signalR.HubConnection | null {
  return connection;
}
