import { useState, useEffect, useRef, FormEvent } from 'react';
import { MessageCircle, Send, User, ArrowLeft, Loader2, Package, Search, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { getOptimizedImageUrl } from '../lib/imageUtils';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface Conversation {
  id: string;
  last_message: string;
  last_message_at: string;
  other_user: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  seller: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
  buyer_unread_count: number;
  seller_unread_count: number;
  listing: {
    id: string;
    title: string;
    image: string;
  };
}

interface ChatViewProps {
  initialConversationId?: string | null;
  onConversationSelected?: () => void;
}

export const ChatView = ({ initialConversationId, onConversationSelected }: ChatViewProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle navigation event to auto-select conversation
    const handleNavigation = (e: any) => {
      const { conversationId } = e.detail || {};
      if (conversationId) {
        fetchConversations().then((convs) => {
          const found = convs?.find((c: any) => c.id === conversationId);
          if (found) {
            setSelectedConversation(found);
            fetchMessages(found.id);
          }
        });
      }
    };

    window.addEventListener('navigate-to-chat', handleNavigation);

    // Initial fetch
    fetchConversations().then((convs) => {
      if (initialConversationId) {
        const found = convs?.find((c: any) => c.id === initialConversationId);
        if (found) {
          setSelectedConversation(found);
          fetchMessages(found.id);
          onConversationSelected?.();
        }
      }
    });

    return () => {
      window.removeEventListener('navigate-to-chat', handleNavigation);
    };
  }, []);

  useEffect(() => {
    if (initialConversationId) {
      const found = conversations.find(c => c.id === initialConversationId);
      if (found) {
        setSelectedConversation(found);
        fetchMessages(found.id);
        onConversationSelected?.();
      } else {
        // If not in current list, fetch again
        fetchConversations().then((convs) => {
          const foundNew = convs?.find((c: any) => c.id === initialConversationId);
          if (foundNew) {
            setSelectedConversation(foundNew);
            fetchMessages(foundNew.id);
            onConversationSelected?.();
          }
        });
      }
    }
  }, [initialConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      await api.chats.deleteMessage(messageId, session.access_token);
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const fetchConversations = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];
      
      setCurrentUserId(session.user.id);
      const data = await api.chats.getConversations(session.access_token);
      setConversations(data);
      return data;
    } catch (err) {
      console.error('Error fetching conversations:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    setIsMessagesLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const data = await api.chats.getMessages(conversationId, session.access_token);
      setMessages(data);
      
      // Trigger unread count refresh in App.tsx
      window.dispatchEvent(new CustomEvent('refresh-unread-count'));
      
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setIsMessagesLoading(false);
    }
  };

  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !currentUserId) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const message = await api.chats.sendMessage(selectedConversation.id, content, session.access_token);
      setMessages(prev => [...prev, message]);
      
      // Refresh conversations to update last message
      fetchConversations();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const filteredConversations = conversations.filter(c => 
    c.other_user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.listing.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-gray-500 font-medium">Loading chats...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-12rem)] flex bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className={`w-full md:w-80 border-r border-gray-100 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-xl py-2 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm font-medium">No messages yet</p>
            </div>
          ) : (
            filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => {
                  setSelectedConversation(conv);
                  fetchMessages(conv.id);
                }}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 transition-all border-b border-gray-50 ${selectedConversation?.id === conv.id ? 'bg-emerald-50/50 border-l-4 border-l-emerald-500' : ''}`}
              >
                <div className="relative flex-shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-gray-100 overflow-hidden">
                    {conv.other_user.avatar_url ? (
                      <img src={getOptimizedImageUrl(conv.other_user.avatar_url, { width: 100, height: 100 })} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white p-0.5 shadow-sm">
                    <img src={getOptimizedImageUrl(conv.listing.image, { width: 50, height: 50 })} alt="" className="w-full h-full rounded-md object-cover" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <h4 className="font-bold text-gray-900 truncate">{conv.other_user.full_name}</h4>
                      {((currentUserId === conv.seller.id && conv.seller_unread_count > 0) || 
                        (currentUserId !== conv.seller.id && conv.buyer_unread_count > 0)) && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 animate-pulse"></span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider truncate mb-1">{conv.listing.title}</p>
                  <p className="text-xs text-gray-500 truncate">{conv.last_message || 'Start a conversation'}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`flex-1 flex flex-col bg-gray-50/30 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-2 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center -space-x-3">
                  {/* Other User Avatar */}
                  <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white overflow-hidden z-10 shadow-sm">
                    {selectedConversation.other_user.avatar_url ? (
                      <img src={getOptimizedImageUrl(selectedConversation.other_user.avatar_url, { width: 100, height: 100 })} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  {/* Seller Avatar (if different from other_user) */}
                  {selectedConversation.seller.id !== selectedConversation.other_user.id && (
                    <div className="w-10 h-10 rounded-xl bg-gray-100 border-2 border-white overflow-hidden z-0 shadow-sm">
                      {selectedConversation.seller.avatar_url ? (
                        <img src={getOptimizedImageUrl(selectedConversation.seller.avatar_url, { width: 100, height: 100 })} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <User className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-bold text-gray-900 leading-tight flex items-center gap-1">
                    <span>{selectedConversation.other_user.full_name}</span>
                    {selectedConversation.seller.id !== selectedConversation.other_user.id && (
                      <span className="text-gray-400 font-normal text-xs">& {selectedConversation.seller.full_name}</span>
                    )}
                  </h3>
                  <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider">{selectedConversation.listing.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 text-gray-400 hover:text-emerald-500 transition-all">
                  <Package className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar">
              {isMessagesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.sender_id === currentUserId;
                  const prevMsg = idx > 0 ? messages[idx - 1] : null;
                  const nextMsg = idx < messages.length - 1 ? messages[idx + 1] : null;
                  
                  const isSameSenderAsPrev = prevMsg?.sender_id === msg.sender_id;
                  const isSameSenderAsNext = nextMsg?.sender_id === msg.sender_id;
                  
                  const timeDiffPrev = prevMsg ? (new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime()) : Infinity;
                  const isRecentAsPrev = timeDiffPrev < 2 * 60 * 1000; // 2 minutes threshold
                  
                  const timeDiffNext = nextMsg ? (new Date(nextMsg.created_at).getTime() - new Date(msg.created_at).getTime()) : Infinity;
                  const isRecentAsNext = timeDiffNext < 2 * 60 * 1000;
                  
                  const isFirstInGroup = !isSameSenderAsPrev || !isRecentAsPrev;
                  const isLastInGroup = !isSameSenderAsNext || !isRecentAsNext;

                  return (
                    <div 
                      key={msg.id}
                      className={`flex group ${isMe ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-4' : 'mt-0.5'}`}
                    >
                      <div className={`relative max-w-[85%] px-4 py-2 text-sm font-medium transition-all duration-200 ${
                        isMe 
                          ? `bg-emerald-500 text-white ${
                              isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-tr-none' :
                              isFirstInGroup ? 'rounded-2xl rounded-tr-none rounded-br-md' :
                              isLastInGroup ? 'rounded-2xl rounded-tr-md rounded-br-none' :
                              'rounded-2xl rounded-tr-md rounded-br-md'
                            }` 
                          : `bg-white text-gray-900 border border-gray-100 shadow-sm ${
                              isFirstInGroup && isLastInGroup ? 'rounded-2xl rounded-tl-none' :
                              isFirstInGroup ? 'rounded-2xl rounded-tl-none rounded-bl-md' :
                              isLastInGroup ? 'rounded-2xl rounded-tl-md rounded-bl-none' :
                              'rounded-2xl rounded-tl-md rounded-bl-md'
                            }`
                      }`}>
                        {msg.content.includes('[PRODUCT_IMAGE]') ? (
                          <div className="space-y-2">
                            <p>{msg.content.split('[PRODUCT_IMAGE]')[0]}</p>
                            <div className="rounded-xl overflow-hidden border border-black/5 bg-gray-50">
                              <img 
                                src={getOptimizedImageUrl(msg.content.split('[PRODUCT_IMAGE]')[1], { width: 400, height: 300 })} 
                                alt="Product" 
                                className="w-full h-auto object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                        <div className={`flex items-center justify-between gap-4 mt-1 ${!isLastInGroup && 'hidden group-hover:flex'}`}>
                          <span className={`text-[8px] block ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button 
                            onClick={() => handleDeleteMessage(msg.id)}
                            className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-black/5 ${isMe ? 'text-emerald-100 hover:text-white' : 'text-gray-300 hover:text-red-500'}`}
                            title="Delete for me"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <input 
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border-none rounded-xl py-3 px-4 text-sm font-medium focus:ring-2 focus:ring-emerald-500/20 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 mb-4">
              <MessageCircle className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-black text-gray-900 mb-2">Your Conversations</h3>
            <p className="text-gray-500 max-w-xs mx-auto text-sm font-medium">Select a chat from the sidebar to start messaging with buyers and sellers.</p>
          </div>
        )}
      </div>
    </div>
  );
};
