import React, { useState } from 'react';
import { useApi } from '../hooks/useErrorHandler';
import { api } from '../services/apiClient';
import { toast } from 'react-hot-toast';

interface SupportTicket {
  id: number;
  subject: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  lastMessage: {
    id: number;
    message: string;
    createdAt: string;
    isInternal: boolean;
  } | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface SupportMessage {
  id: number;
  message: string;
  createdAt: string;
  isInternal: boolean;
}

interface CreateTicketData {
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
}

interface TicketsResponse {
  tickets: SupportTicket[];
  pagination?: { total: number };
}

interface ApiSuccessResponse {
  success?: boolean;
}

interface TicketDetailResponse {
  messages?: SupportMessage[];
  success?: boolean;
}

const Support: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'chat'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [newTicketModal, setNewTicketModal] = useState(false);
  const [ticketData, setTicketData] = useState<CreateTicketData>({
    subject: '',
    message: '',
    priority: 'medium',
  });

  // Fetch tickets
  const {
    data: ticketsResponse,
    loading: ticketsLoading,
    execute: fetchTickets,
  } = useApi<TicketsResponse>(async () => {
    const { data } = await api.get('/support/tickets');
    return data;
  }, {
    immediate: true,
  });

  // Create new ticket
  const {
    data: createResponse,
    loading: createLoading,
    execute: createTicket,
  } = useApi<ApiSuccessResponse>(async () => {
    const { data } = await api.post('/support/ticket', ticketData);
    return data;
  });

  // Fetch ticket details
  const {
    data: ticketResponse,
    loading: ticketLoading,
    execute: fetchTicket,
  } = useApi<TicketDetailResponse, [number]>(async (id: number) => {
    const { data } = await api.get(`/support/ticket/${id}`);
    return data;
  }, {
    immediate: false,
  });

  // Send message
  const {
    data: messageResponse,
    loading: messageLoading,
    execute: sendMessage,
  } = useApi<ApiSuccessResponse, [{ ticketId: number; message: string }]>(async (data: { ticketId: number; message: string }) => {
    const { data: response } = await api.post('/support/message', data);
    return response;
  }, {
    immediate: false,
  });

  // Close ticket
  const {
    data: closeResponse,
    loading: closeLoading,
    execute: closeTicket,
  } = useApi<ApiSuccessResponse, [number]>(async (id: number) => {
    const { data } = await api.post('/support/close', { ticketId: id });
    return data;
  }, {
    immediate: false,
  });

  const tickets = ticketsResponse?.tickets || [];
  const totalTickets = ticketsResponse?.pagination?.total || 0;

  // Handle ticket selection
  const handleTicketClick = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setActiveTab('chat');
    fetchTicket(ticket.id);
  };

  // Handle new ticket creation
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!ticketData.subject.trim() || !ticketData.message.trim()) {
      toast.error('Konu ve mesaj zorunludur.');
      return;
    }

    createTicket();
  };

  // Handle message sending
  const handleSendMessage = (message: string) => {
    if (!message.trim() || !selectedTicket) return;
    
    sendMessage({
      ticketId: selectedTicket.id,
      message,
    });
  };

  // Handle ticket closing
  const handleCloseTicket = () => {
    if (!selectedTicket) return;
    
    closeTicket(selectedTicket.id);
  };

  // Reset form
  const resetForm = () => {
    setTicketData({
      subject: '',
      message: '',
      priority: 'medium',
    });
    setNewTicketModal(false);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-orange-100 text-orange-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (createResponse?.success) {
    toast.success('Destek talebi oluşturuldu!');
    resetForm();
    fetchTickets();
  }

  if (messageResponse?.success) {
    toast.success('Mesaj gönderildi!');
  }

  if (closeResponse?.success) {
    toast.success('Destek talebi kapatıldı!');
    setSelectedTicket(null);
    setActiveTab('tickets');
    fetchTickets();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900">Destek Merkezi</h1>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('tickets')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tickets'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Destek Talepleri ({totalTickets})
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'chat'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Mesajlaşma
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'tickets' && (
              <div>
                {/* New Ticket Button */}
                <div className="mb-6 flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-900">Destek Talepleri</h2>
                  <button
                    onClick={() => setNewTicketModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Yeni Talep Oluştur
                  </button>
                </div>

                {/* Loading State */}
                {ticketsLoading && (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Destek talepleri yükleniyor...</p>
                  </div>
                )}

                {/* Empty State */}
                {!ticketsLoading && tickets.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002 2v5a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Henüz Destek Talebi Yok</h3>
                    <p className="text-gray-600 mb-4">
                      Henüz bir destek talebi oluşturmadınız. Yeni bir talep oluşturmak için "Yeni Talep Oluştur" butonuna tıklayın.
                    </p>
                    <button
                      onClick={() => setNewTicketModal(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      İlk Talebi Oluştur
                    </button>
                  </div>
                )}

                {/* Tickets List */}
                {!ticketsLoading && tickets.length > 0 && (
                  <div className="space-y-4">
                    {tickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        onClick={() => handleTicketClick(ticket)}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">{ticket.subject}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                                {ticket.status === 'open' ? 'Açık' : 
                                 ticket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                                {ticket.priority === 'high' ? 'Yüksek' : 
                                 ticket.priority === 'medium' ? 'Orta' : 'Düşük'}
                              </span>
                            </div>
                          </div>
                          <div className="text-sm text-gray-500">
                            #{ticket.id} • {formatDate(ticket.createdAt)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          {ticket.lastMessage && (
                            <div>
                              <p className="truncate">{ticket.lastMessage.message}</p>
                              <p className="text-xs text-gray-400">
                                {formatDate(ticket.lastMessage.createdAt)}
                                {ticket.lastMessage.isInternal && ' • Destek Ekibi'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'chat' && selectedTicket && (
              <div>
                {/* Chat Header */}
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                          {selectedTicket.status === 'open' ? 'Açık' : 
                           selectedTicket.status === 'in_progress' ? 'İşlemde' : 'Kapalı'}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                          {selectedTicket.priority === 'high' ? 'Yüksek' : 
                           selectedTicket.priority === 'medium' ? 'Orta' : 'Düşük'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        Talep #{selectedTicket.id} • {formatDate(selectedTicket.createdAt)}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      {selectedTicket.status !== 'closed' && (
                        <button
                          onClick={handleCloseTicket}
                          disabled={closeLoading}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors disabled:bg-gray-400"
                        >
                          {closeLoading ? 'Kapatılıyor...' : 'Talebi Kapat'}
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedTicket(null);
                          setActiveTab('tickets');
                        }}
                        className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                      >
                        Listeye Dön
                      </button>
                    </div>
                  </div>
                </div>

                {/* Messages */}
                <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
                  {ticketLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                      <p className="text-gray-600">Mesajlar yükleniyor...</p>
                    </div>
                  ) : (
                    ticketResponse?.messages?.map((message: SupportMessage) => (
                      <div
                        key={message.id}
                        className={`flex ${message.isInternal ? 'justify-end' : 'justify-start'} mb-4`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${message.isInternal ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'} rounded-lg p-3 shadow-sm`}>
                          <div className="flex items-center gap-2 mb-1">
                            {message.isInternal && (
                              <span className="text-xs bg-blue-700 text-white px-2 py-1 rounded">Destek</span>
                            )}
                            <span className="text-xs text-gray-500">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                {selectedTicket.status !== 'closed' && (
                  <div className="border-t border-gray-200 pt-4">
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const formData = new FormData(e.currentTarget);
                        handleSendMessage(formData.get('message') as string);
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        name="message"
                        placeholder="Mesajınızı yazın..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        disabled={messageLoading}
                      />
                      <button
                        type="submit"
                        disabled={messageLoading}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                      >
                        {messageLoading ? 'Gönderiliyor...' : 'Gönder'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* New Ticket Modal */}
        {newTicketModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full z-50">
            <div className="flex min-h-full items-center justify-center p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                <div className="border-b border-gray-200 px-6 py-4">
                  <h3 className="text-lg font-medium text-gray-900">Yeni Destek Talebi</h3>
                </div>
                <form onSubmit={handleCreateTicket} className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Konu
                    </label>
                    <input
                      type="text"
                      value={ticketData.subject}
                      onChange={(e) => setTicketData(prev => ({ ...prev, subject: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Destek talebinizin konusu"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Öncelik
                    </label>
                    <select
                      value={ticketData.priority}
                      onChange={(e) => setTicketData(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="low">Düşük</option>
                      <option value="medium">Orta</option>
                      <option value="high">Yüksek</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Mesaj
                    </label>
                    <textarea
                      value={ticketData.message}
                      onChange={(e) => setTicketData(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Lütfen sorunuzu detaylı bir şekilde açıklayın..."
                      required
                    />
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      İptal
                    </button>
                    <button
                      type="submit"
                      disabled={createLoading}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                    >
                      {createLoading ? 'Oluşturuluyor...' : 'Talep Oluştur'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Support;
