import React, { useState, useEffect } from 'react';
import SupportChat from '../components/SupportChat';
import { 
  MessageSquare, 
  Clock, 
  User, 
  CheckCircle, 
  Filter,
  Search,
  Eye,
  Archive
} from 'lucide-react';

interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  assignedTo?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    messages: number;
  };
}

interface TicketStats {
  byStatus: Array<{ status: string; _count: number }>;
  byCategory: Array<{ category: string; _count: number }>;
  byPriority: Array<{ priority: string; _count: number }>;
}

const AdminSupportPanel: React.FC = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [currentPage] = useState(1);

  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [currentPage, searchTerm, statusFilter, categoryFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(priorityFilter && { priority: priorityFilter })
      });

      const response = await fetch(`/api/support/tickets?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setTickets(data.data.tickets);
      }
    } catch (error) {
      console.error('Failed to fetch tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/support/tickets/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'text-blue-600 bg-blue-50';
      case 'in_progress': return 'text-yellow-600 bg-yellow-50';
      case 'waiting_customer': return 'text-orange-600 bg-orange-50';
      case 'resolved': return 'text-green-600 bg-green-50';
      case 'closed': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'text-gray-600 bg-gray-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'urgent': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'open': return 'Açık';
      case 'in_progress': return 'İşleniyor';
      case 'waiting_customer': return 'Müşteri Bekleniyor';
      case 'resolved': return 'Çözüldü';
      case 'closed': return 'Kapalı';
      default: return status;
    }
  };

  const getPriorityText = (priority: string) => {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'urgent': return 'Acil';
      default: return priority;
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/support/tickets/${ticketId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();
      
      if (data.success) {
        fetchTickets();
        if (selectedTicket?.id === ticketId) {
          setSelectedTicket(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to update ticket status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 h-screen overflow-y-auto">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Destek Paneli</h1>
            
            {/* Stats Cards */}
            {stats && (
              <div className="space-y-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Durum</h3>
                  <div className="space-y-1">
                    {stats.byStatus.map((stat) => (
                      <div key={stat.status} className="flex justify-between text-sm">
                        <span className="text-blue-700">{getStatusText(stat.status)}</span>
                        <span className="font-medium text-blue-900">{stat._count}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-yellow-900 mb-2">Öncelik</h3>
                  <div className="space-y-1">
                    {stats.byPriority.map((stat) => (
                      <div key={stat.priority} className="flex justify-between text-sm">
                        <span className="text-yellow-700">{getPriorityText(stat.priority)}</span>
                        <span className="font-medium text-yellow-900">{stat._count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Search className="w-4 h-4 inline mr-2" />
                  Ara
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ticket ara..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Filter className="w-4 h-4 inline mr-2" />
                  Filtreler
                </label>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="">Tüm Durumlar</option>
                  <option value="open">Açık</option>
                  <option value="in_progress">İşleniyor</option>
                  <option value="waiting_customer">Müşteri Bekleniyor</option>
                  <option value="resolved">Çözüldü</option>
                  <option value="closed">Kapalı</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                >
                  <option value="">Tüm Öncelikler</option>
                  <option value="low">Düşük</option>
                  <option value="medium">Orta</option>
                  <option value="high">Yüksek</option>
                  <option value="urgent">Acil</option>
                </select>

                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tüm Kategoriler</option>
                  <option value="technical">Teknik</option>
                  <option value="billing">Faturalandırma</option>
                  <option value="feature_request">Özellik İsteği</option>
                  <option value="bug_report">Hata Raporu</option>
                  <option value="other">Diğer</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ticket List */}
          <div className="border-t border-gray-200">
            {loading ? (
              <div className="p-4 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    className={`p-4 border-l-4 cursor-pointer transition-colors ${
                      selectedTicket?.id === ticket.id
                        ? 'bg-blue-50 border-blue-600'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {ticket.subject}
                        </h3>
                        <p className="text-xs text-gray-500">
                          #{ticket.ticketNumber}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(ticket.priority)}`}>
                          {getPriorityText(ticket.priority)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User className="w-3 h-3" />
                        <span>
                          {ticket.user.firstName} {ticket.user.lastName}
                        </span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>
                          {new Date(ticket.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(ticket.status)}`}>
                        {getStatusText(ticket.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {selectedTicket ? (
            <>
              {/* Ticket Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">
                      {selectedTicket.subject}
                    </h2>
                    <p className="text-sm text-gray-600 mb-4">
                      #{selectedTicket.ticketNumber}
                    </p>
                    
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-3 py-1 rounded-full ${getPriorityColor(selectedTicket.priority)}`}>
                        {getPriorityText(selectedTicket.priority)}
                      </span>
                      <span className={`px-3 py-1 rounded-full ${getStatusColor(selectedTicket.status)}`}>
                        {getStatusText(selectedTicket.status)}
                      </span>
                      <span className="text-gray-600">
                        {selectedTicket.category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'in_progress')}
                      className="p-2 text-blue-600 hover:text-blue-800 transition-colors"
                      title="İşlemeye al"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'resolved')}
                      className="p-2 text-green-600 hover:text-green-800 transition-colors"
                      title="Çözüldü olarak işaretle"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => updateTicketStatus(selectedTicket.id, 'closed')}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="Kapat"
                    >
                      <Archive className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Oluşturan:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {selectedTicket.user.firstName} {selectedTicket.user.lastName}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Oluşturulma:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {new Date(selectedTicket.createdAt).toLocaleString('tr-TR')}
                    </span>
                  </div>
                  {selectedTicket.assignedTo && (
                    <div>
                      <span className="text-gray-600">Atanan:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedTicket.assignedTo.firstName} {selectedTicket.assignedTo.lastName}
                      </span>
                    </div>
                  )}
                  {selectedTicket.resolvedAt && (
                    <div>
                      <span className="text-gray-600">Çözüldü:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {new Date(selectedTicket.resolvedAt).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chat Component */}
              <div className="flex-1">
                <SupportChat
                  ticketId={selectedTicket.id}
                  ticketStatus={selectedTicket.status}
                  isSupportAgent={true}
                  onStatusChange={(status: string) => updateTicketStatus(selectedTicket.id, status)}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ticket Seçin
                </h3>
                <p className="text-gray-600">
                  Görüntülemek için soldan bir ticket seçin
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSupportPanel;
