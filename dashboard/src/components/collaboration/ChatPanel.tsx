'use client';

import { useState, useEffect, useRef } from 'react';
import { useCollaboration } from './CollaborationProvider';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@/components/ui';

export function ChatPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { chatMessages, sendChatMessage, activeUsers, currentUser, isConnected } = useCollaboration();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSend = () => {
    if (message.trim()) {
      sendChatMessage(message);
      setMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent-primary hover:bg-accent-primary/80 transition-colors shadow-lg flex items-center justify-center"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        {chatMessages.length > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
            {chatMessages.length > 9 ? '9+' : chatMessages.length}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-96">
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Team Chat</CardTitle>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-xs text-text-muted">
                {activeUsers.length + 1} user{activeUsers.length !== 0 ? 's' : ''} online
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </CardHeader>
        
        <CardContent className="p-0">
          {/* Active Users */}
          <div className="px-4 py-2 border-b border-white/10">
            <div className="text-xs text-text-muted mb-2">Active Users</div>
            <div className="flex flex-wrap gap-2">
              {currentUser && (
                <div className="flex items-center space-x-1 px-2 py-1 rounded-full glass-card">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentUser.color }} />
                  <span className="text-xs text-text-primary">{currentUser.name} (You)</span>
                </div>
              )}
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center space-x-1 px-2 py-1 rounded-full glass-card">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: user.color }} />
                  <span className="text-xs text-text-primary">{user.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="h-96 overflow-y-auto p-4 space-y-3">
            {chatMessages.length === 0 ? (
              <div className="text-center text-text-muted text-sm py-10">
                No messages yet. Start a conversation!
              </div>
            ) : (
              chatMessages.map((msg) => {
                const isCurrentUser = msg.userId === currentUser?.id;
                const user = activeUsers.find(u => u.id === msg.userId) || currentUser;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] ${isCurrentUser ? 'order-2' : 'order-1'}`}>
                      <div className={`flex items-center space-x-2 mb-1 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                        <span className="text-xs text-text-muted">{msg.userName}</span>
                        <span className="text-xs text-text-muted">{formatTime(msg.timestamp)}</span>
                      </div>
                      <div
                        className={`px-3 py-2 rounded-lg ${
                          isCurrentUser
                            ? 'bg-accent-primary text-white'
                            : 'glass-card text-text-primary'
                        }`}
                      >
                        <p className="text-sm break-words">{msg.message}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/10">
            <div className="flex space-x-2">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1"
                disabled={!isConnected}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleSend}
                disabled={!message.trim() || !isConnected}
              >
                Send
              </Button>
            </div>
            {!isConnected && (
              <p className="text-xs text-red-400 mt-2">Disconnected - reconnecting...</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
