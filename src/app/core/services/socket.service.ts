import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { AppConfig } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  public socket: Socket;
  private currentRoom: string;
  private messageQueue: any[] = [];
  
  // ⭐ NEW: Use Subjects for proper subscription management
  private messageSubject = new Subject<any>();
  private disconnectSubject = new Subject<any>();
  
  // ⭐ NEW: Track if listeners are bound
  private listenersActive = false;

  constructor() {}

  init() {
    if (this.socket && this.socket.connected) {
      console.log('[SOCKET] Already connected');
      return;
    }
    
    // ⭐ If socket exists but disconnected, destroy it first
    if (this.socket) {
      console.log('[SOCKET] 🧹 Cleaning up old socket');
      this.destroy();
    }
    
    console.log('[SOCKET] Connecting to:', AppConfig.api);
    
    this.socket = io(AppConfig.api, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // ⭐ Bind listeners only once
    this.bindListeners();

    this.socket.on('connect', () => {
      console.log('[SOCKET] ✅ Connected! Socket ID:', this.socket.id);
      
      // Process queued messages
      if (this.messageQueue.length > 0) {
        console.log('[SOCKET] 📦 Processing', this.messageQueue.length, 'queued messages');
        this.messageQueue.forEach(msg => {
          this.socket.emit('message', msg);
        });
        this.messageQueue = [];
      }
      
      if (this.currentRoom) {
        console.log('[SOCKET] Re-joining room:', this.currentRoom);
        this.joinRoom(this.currentRoom);
      }
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SOCKET] ❌ Connection error:', err.message);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn('[SOCKET] ⚠️ Disconnected. Reason:', reason);
    });

    this.socket.on('error', (err) => {
      console.error('[SOCKET] ❌ Socket error:', err);
    });
  }

  // ⭐ NEW: Bind socket listeners to Subjects
  private bindListeners() {
    if (this.listenersActive) {
      console.log('[SOCKET] ⚠️ Listeners already active, skipping...');
      return;
    }

    console.log('[SOCKET] 📡 Binding listeners...');
    
    this.socket.on('message', (data) => {
      console.log('[SOCKET] 📨 Received:', typeof data === 'string' ? data.substring(0, 50) : 'signal');
      this.messageSubject.next(data);
    });

    this.socket.on('peer-disconnected', (id) => {
      console.log('[SOCKET] 👋 Peer disconnected:', id);
      this.disconnectSubject.next(id);
    });

    this.listenersActive = true;
  }

  // ⭐ NEW: Unbind socket listeners
  private unbindListeners() {
    if (!this.listenersActive) {
      console.log('[SOCKET] ⚠️ Listeners not active, skipping unbind...');
      return;
    }

    console.log('[SOCKET] 🧹 Unbinding listeners...');
    
    if (this.socket) {
      this.socket.off('message');
      this.socket.off('peer-disconnected');
    }

    this.listenersActive = false;
  }

  destroy() {
    console.log('[SOCKET] 🧹 Destroying socket connection');
    
    try {
      // ⭐ Leave current room first
      if (this.currentRoom && this.socket?.connected) {
        console.log('[SOCKET] 🚪 Leaving room:', this.currentRoom);
        this.socket.emit('leave', this.currentRoom);
      }
      
      // ⭐ Unbind listeners
      this.unbindListeners();
      
      // ⭐ Remove all socket event listeners
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }
      
      // ⭐ Clear room and queue
      this.currentRoom = null;
      this.messageQueue = [];
      
      console.log('[SOCKET] ✅ Socket destroyed successfully');
    } catch (err) {
      console.error('[SOCKET] ❌ Error destroying:', err);
    }
  }

  // ⭐ NEW: Proper leave room method
  leaveRoom(roomId?: string) {
    const room = roomId || this.currentRoom;
    if (!room) {
      console.warn('[SOCKET] ⚠️ No room to leave');
      return;
    }

    console.log('[SOCKET] 🚪 Leaving room:', room);
    
    if (this.socket?.connected) {
      this.socket.emit('leave', room);
    }
    
    if (room === this.currentRoom) {
      this.currentRoom = null;
    }
  }

  joinRoom(id: string) {
    console.log('[SOCKET] 📥 Joining room:', id);
    
    // ⭐ Leave old room first if different
    if (this.currentRoom && this.currentRoom !== id) {
      this.leaveRoom(this.currentRoom);
    }
    
    this.currentRoom = id;
    
    if (this.socket?.connected) {
      this.socket.emit('join', id);
    } else {
      console.warn('[SOCKET] ⚠️ Not connected, room will be joined on connect');
    }
  }

  sendMessage(msg: any) {
    if (!this.socket) {
      console.error('[SOCKET] ❌ Socket not initialized');
      return;
    }
    
    if (!this.socket.connected) {
      console.warn('[SOCKET] ⚠️ Not connected yet, queueing message');
      this.messageQueue.push(msg);
      return;
    }
    
    console.log('[SOCKET] 📤 Sending message:', typeof msg === 'string' ? msg.substring(0, 50) : 'signal data');
    this.socket.emit('message', msg);
  }

  // ⭐ FIXED: Now returns the Subject as Observable (no new listeners!)
  onNewMessage(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  // ⭐ FIXED: Now returns the Subject as Observable (no new listeners!)
  onDisconnected(): Observable<any> {
    return this.disconnectSubject.asObservable();
  }
}