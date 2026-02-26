'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';

interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: { x: number; y: number };
  currentPage?: string;
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: number;
}

interface CollaborationContextType {
  currentUser: User | null;
  activeUsers: User[];
  chatMessages: ChatMessage[];
  sendChatMessage: (message: string) => void;
  updateCursorPosition: (x: number, y: number) => void;
  isConnected: boolean;
}

const CollaborationContext = createContext<CollaborationContextType | undefined>(undefined);

export function useCollaboration() {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error('useCollaboration must be used within CollaborationProvider');
  }
  return context;
}

interface CollaborationProviderProps {
  children: ReactNode;
}

export function CollaborationProvider({ children }: CollaborationProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  
  const { isConnected, wsService } = useWebSocket();

  // Initialize current user
  useEffect(() => {
    // In production, get from auth context
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    const user: User = {
      id: `user_${Math.random().toString(36).substr(2, 9)}`,
      name: `User ${Math.floor(Math.random() * 1000)}`,
      email: 'user@example.com',
      color: randomColor,
      currentPage: window.location.pathname,
    };
    
    setCurrentUser(user);
    
    // Send user joined event
    if (isConnected) {
      wsService.emit('collaboration', {
        type: 'user_joined',
        user,
      });
    }
  }, [isConnected]);

  // Handle cursor movement
  const updateCursorPosition = (x: number, y: number) => {
    if (!currentUser) return;
    
    const updatedUser = { ...currentUser, cursor: { x, y } };
    setCurrentUser(updatedUser);
    
    if (isConnected) {
      wsService.emit('collaboration', {
        type: 'cursor_move',
        userId: currentUser.id,
        cursor: { x, y },
      });
    }
  };

  // Handle chat messages
  const sendChatMessage = (message: string) => {
    if (!currentUser || !message.trim()) return;
    
    const chatMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      userId: currentUser.id,
      userName: currentUser.name,
      message: message.trim(),
      timestamp: Date.now(),
    };
    
    setChatMessages(prev => [...prev, chatMessage]);
    
    if (isConnected) {
      wsService.emit('collaboration', {
        type: 'chat_message',
        message: chatMessage,
      });
    }
  };

  // Listen for WebSocket events
  useEffect(() => {
    if (!isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'user_joined':
            setActiveUsers(prev => {
              if (prev.find(u => u.id === data.user.id)) return prev;
              return [...prev, data.user];
            });
            break;
            
          case 'user_left':
            setActiveUsers(prev => prev.filter(u => u.id !== data.userId));
            break;
            
          case 'cursor_move':
            setActiveUsers(prev => 
              prev.map(u => 
                u.id === data.userId 
                  ? { ...u, cursor: data.cursor }
                  : u
              )
            );
            break;
            
          case 'chat_message':
            if (data.message.userId !== currentUser?.id) {
              setChatMessages(prev => [...prev, data.message]);
            }
            break;
            
          case 'active_users':
            setActiveUsers(data.users.filter((u: User) => u.id !== currentUser?.id));
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isConnected, currentUser]);

  // Track cursor movement
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updateCursorPosition(e.clientX, e.clientY);
    };

    // Throttle cursor updates
    let throttleTimeout: NodeJS.Timeout;
    const throttledMouseMove = (e: MouseEvent) => {
      if (!throttleTimeout) {
        throttleTimeout = setTimeout(() => {
          handleMouseMove(e);
          throttleTimeout = null as any;
        }, 50);
      }
    };

    window.addEventListener('mousemove', throttledMouseMove);
    return () => window.removeEventListener('mousemove', throttledMouseMove);
  }, [currentUser]);

  const value: CollaborationContextType = {
    currentUser,
    activeUsers,
    chatMessages,
    sendChatMessage,
    updateCursorPosition,
    isConnected,
  };

  return (
    <CollaborationContext.Provider value={value}>
      {children}
    </CollaborationContext.Provider>
  );
}
