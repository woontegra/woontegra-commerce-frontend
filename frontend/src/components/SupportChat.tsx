import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, User, Bot, Clock, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  messageType: string;
  isInternal: boolean;
  createdAt: string;
  sender: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  attachments?: Array<{
    id: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }>;
}

interface SupportChatProps {
  ticketId: string;
  ticketStatus: string;
  isSupportAgent?: boolean;
  onStatusChange?: (status: string) => void;
}

const SupportChat: React.FC<SupportChatProps> = ({
  ticketId,
  ticketStatus,
  isSupportAgent = false,
  onStatusChange
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Set up WebSocket or polling for real-time updates
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [ticketId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.data.messages || []);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachedFiles.length === 0) return;

    setIsLoading(true);
    setIsTyping(false);

    try {
      const formData = new FormData();
      formData.append('content', newMessage);
      formData.append('messageType', 'text');
      formData.append('isInternal', isSupportAgent ? 'true' : 'false');

      // Add files
      attachedFiles.forEach((file, index) => {
        formData.append(`file${index}`, file);
      });

      const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
        setAttachedFiles([]);
        
        // Update ticket status if needed
        if (ticketStatus === 'waiting_customer' && !isSupportAgent) {
          onStatusChange?.('in_progress');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isOwnMessage = (message: Message) => {
    // In a real app, you'd compare with current user ID
    return message.sender.email === 'current@example.com';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-xs lg:max-w-md xl:max-w-lg ${
              isOwnMessage(message) ? 'order-2' : 'order-1'
            }`}>
              {/* Sender Info */}
              {!isOwnMessage(message) && (
                <div className="flex items-center gap-2 mb-1">
                  {message.isInternal ? (
                    <Bot className="w-4 h-4 text-blue-600" />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="text-sm font-medium text-gray-900">
                    {message.isInternal 
                      ? 'Support Agent' 
                      : `${message.sender.firstName} ${message.sender.lastName}`
                    }
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                </div>
              )}

              {/* Message Bubble */}
              <div className={`rounded-lg px-4 py-2 ${
                isOwnMessage(message)
                  ? 'bg-blue-600 text-white'
                  : message.isInternal
                  ? 'bg-yellow-100 text-yellow-900 border border-yellow-200'
                  : 'bg-gray-100 text-gray-900'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {message.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 p-2 bg-white/20 rounded"
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-xs truncate flex-1">
                          {attachment.fileName}
                        </span>
                        <span className="text-xs opacity-75">
                          ({formatFileSize(attachment.fileSize)})
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Timestamp for own messages */}
              {isOwnMessage(message) && (
                <div className="flex items-center gap-2 mt-1 justify-end">
                  <span className="text-xs text-gray-500">
                    {formatTime(message.createdAt)}
                  </span>
                  {message.messageType === 'text' && (
                    <CheckCircle className="w-3 h-3 text-blue-600" />
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t p-4">
        {/* File Attachments */}
        {attachedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {attachedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2"
              >
                <Paperclip className="w-4 h-4 text-gray-600" />
                <span className="text-sm truncate max-w-xs">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex items-end gap-2">
          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isLoading}
          >
            <Paperclip className="w-5 h-5" />
          </button>

          {/* Message Input */}
          <div className="flex-1">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Mesajınızı yazın..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={1}
              disabled={isLoading}
            />
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={isLoading || (!newMessage.trim() && attachedFiles.length === 0)}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Status Indicator */}
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>
            {ticketStatus === 'open' && 'Ticket açık - Destek bekleniyor'}
            {ticketStatus === 'in_progress' && 'Ticket işleniyor'}
            {ticketStatus === 'waiting_customer' && 'Müşteri yanıtı bekleniyor'}
            {ticketStatus === 'resolved' && 'Ticket çözüldü'}
            {ticketStatus === 'closed' && 'Ticket kapandı'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default SupportChat;
