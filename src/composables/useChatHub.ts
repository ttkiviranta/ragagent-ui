import { ref } from 'vue'
import * as signalR from '@microsoft/signalr'

export function useChatHub() {
  const isConnected = ref(false)
  const connection = new signalR.HubConnectionBuilder()
    .withUrl('https://localhost:7000/chathub', {
      withCredentials: true,
      skipNegotiation: false,
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000])
    .configureLogging(signalR.LogLevel.Information)
    .build()

  async function connect() {
    if (connection.state === signalR.HubConnectionState.Connected) {
      return
    }

    try {
      await connection.start()
      isConnected.value = true
      console.log('[SignalR] Connected successfully')
    } catch (err) {
      console.error('[SignalR] Connection failed:', err)
      isConnected.value = false
      throw err
    }
  }

  async function disconnect() {
    if (connection.state === signalR.HubConnectionState.Connected) {
      await connection.stop()
      isConnected.value = false
      console.log('[SignalR] Disconnected')
    }
  }

  // Auto-reconnect handler
  connection.onreconnecting((error) => {
    console.warn('[SignalR] Reconnecting...', error)
    isConnected.value = false
  })

  connection.onreconnected(() => {
    console.log('[SignalR] Reconnected')
    isConnected.value = true
  })

  connection.onclose((error) => {
    console.error('[SignalR] Connection closed', error)
    isConnected.value = false
  })

  return {
    connection,
    isConnected,
    connect,
    disconnect,
  }
}
