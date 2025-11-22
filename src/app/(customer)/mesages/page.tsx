// src/app/(customer)/messages/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  from_user_id: string;
  to_user_id: string;
  message: string;
  read: boolean;
  created_at: string;
}

export default function CustomerMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMessages();
  }, []);

  const fetchMessages = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: messagesData } = await supabase
      .from('messages')
      .select('*')
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (messagesData) {
      setMessages(messagesData);
    }
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Messages</h1>
      
      <div className="bg-white rounded-lg shadow-md">
        {messages.map(message => (
          <div key={message.id} className="border-b last:border-b-0 p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-gray-800">{message.message}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(message.created_at).toLocaleString()}
                </p>
              </div>
              {!message.read && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                  New
                </span>
              )}
            </div>
          </div>
        ))}
        
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );
}