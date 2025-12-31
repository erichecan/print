/**
 * Chat Page
* 聊天页面 - 提供客户支持聊天功能
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { chatApi } from '@/lib/api';
import { useToast } from '@/hooks/useToast';

export default function ChatPage() {
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');

  useEffect(() => {
    loadRooms();
  }, []);

  useEffect(() => {
    if (selectedRoom) {
      loadMessages(selectedRoom);
    }
  }, [selectedRoom]);

  const loadRooms = async () => {
    try {
      setLoading(true);
      const response = await chatApi.getRooms();
      if (response.rooms) {
        setRooms(response.rooms);
        if (response.rooms.length > 0 && !selectedRoom) {
          setSelectedRoom(response.rooms[0].id);
        }
      }
    } catch (err) {
      console.error('[Chat] Error loading rooms:', err);
      showError('Failed to load chat rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (roomId: string) => {
    try {
      const response = await chatApi.getMessages(roomId);
      if (response.messages) {
        setMessages(response.messages);
      }
    } catch (err) {
      console.error('[Chat] Error loading messages:', err);
      showError('Failed to load messages');
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedRoom) return;

    try {
      await chatApi.sendMessage(selectedRoom, { content: messageText.trim() });
      setMessageText('');
      await loadMessages(selectedRoom);
    } catch (err) {
      console.error('[Chat] Error sending message:', err);
      showError('Failed to send message');
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">Loading chat...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/" className="text-blue-600 hover:underline">
          ← Back to Home
        </Link>
        <h1 className="text-3xl font-bold mt-4">Customer Support Chat</h1>
        <p className="text-gray-600 mt-2">Get help from our support team</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Chat Rooms List */}
        <div className="border rounded-lg p-4">
          <h2 className="font-semibold mb-4">Chat Rooms</h2>
          {rooms.length === 0 ? (
            <div className="text-gray-500 text-sm">No chat rooms available</div>
          ) : (
            <div className="space-y-2">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={`w-full text-left p-2 rounded ${
                    selectedRoom === room.id
                      ? 'bg-blue-100 border border-blue-300'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{room.name || `Room ${room.id.slice(0, 8)}`}</div>
                  <div className="text-sm text-gray-500">{room.status || 'active'}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Messages Area */}
        <div className="md:col-span-2 border rounded-lg flex flex-col" style={{ height: '600px' }}>
          {selectedRoom ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.senderType === 'user' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.senderType === 'user'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}
                      >
                        <div className="text-sm font-medium mb-1">
                          {message.senderName || (message.senderType === 'user' ? 'You' : 'Support')}
                        </div>
                        <div>{message.content}</div>
                        <div className="text-xs mt-1 opacity-75">
                          {new Date(message.createdAt).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageText.trim()}
                    className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Select a chat room to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

