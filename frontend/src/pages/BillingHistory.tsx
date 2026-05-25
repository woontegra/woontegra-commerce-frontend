import React, { useState, useEffect } from 'react';
import { Calendar, Download, TrendingUp, AlertCircle, Check } from 'lucide-react';

interface BillingCycle {
  id: string;
  amount: number;
  currency: string;
  status: string;
  startDate: string;
  endDate?: string;
  paymentMethod?: {
    type: string;
    provider: string;
    token?: string;
  };
  billingCycle?: 'monthly' | 'yearly';
  invoiceId?: string;
  failureReason?: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidDate?: string;
  items: any;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
}

const BillingHistory: React.FC = () => {
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'cycles' | 'invoices'>('cycles');

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      const response = await fetch('/api/payment/billing-history');
      const data = await response.json();
      
      if (data.success) {
        setBillingCycles(data.billingCycles);
        setInvoices(data.invoices);
      }
    } catch (error) {
      console.error('Failed to fetch billing history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'refunded':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Ödendi';
      case 'pending':
        return 'Beklemede';
      case 'failed':
        return 'Başarısız';
      case 'refunded':
        return 'İade Edildi';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check className="w-4 h-4" />;
      case 'pending':
        return <Calendar className="w-4 h-4" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4" />;
      case 'refunded':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Fatura Geçmişi</h1>
          <p className="text-gray-600 mt-2">Ödeme geçmişinizi ve faturalarınızı görüntüleyin</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('cycles')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'cycles'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Ödeme Döngüleri
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === 'invoices'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900 border-b-2 border-transparent'
              }`}
            >
              Faturalar
            </button>
          </div>
        </div>

        {/* Content */}
        {activeTab === 'cycles' && (
          <div className="space-y-4">
            {billingCycles.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Ödeme Geçmişi Yok</h3>
                <p className="text-gray-600">
                  Henüz ödeme yapılmamış
                </p>
              </div>
            ) : (
              billingCycles.map((cycle) => (
                <div key={cycle.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {cycle.paymentMethod?.provider?.toUpperCase() || 'Bilinmiyor'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {cycle.paymentMethod?.type === 'credit_card' && `••••• ${cycle.paymentMethod.token?.slice(-4)}`}
                        {cycle.paymentMethod?.type === 'bank_transfer' && 'Havale'}
                        {cycle.paymentMethod?.type === 'iyzico' && 'İyzico'}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(cycle.status)}`}>
                      {getStatusText(cycle.status)}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {getStatusIcon(cycle.status)}
                    <span className="text-sm text-gray-500">
                      {cycle.failureReason && `(${cycle.failureReason})`}
                    </span>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">
                      ₺{cycle.amount}
                    </p>
                    <p className="text-sm text-gray-600">
                      {cycle.currency} / {cycle.billingCycle === 'yearly' ? 'yıllık' : 'aylık'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span>Ödeme Tarihi:</span>
                        <span className="font-medium">{new Date(cycle.startDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div>
                        <span>Dönem:</span>
                        <span className="font-medium">
                          {cycle.endDate ? new Date(cycle.endDate).toLocaleDateString('tr-TR') : 'Devam Ediyor'}
                        </span>
                      </div>
                    </div>

                    {cycle.invoiceId && (
                      <div className="mt-4">
                        <button
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 transition-colors"
                          onClick={() => window.open(`/api/invoices/${cycle.invoiceId}`, '_blank')}
                        >
                          <Download className="w-4 h-4" />
                          Fatura İndir
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'invoices' && (
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 text-gray-400">📄</div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Fatura Yok</h3>
                <p className="text-gray-600">
                  Henüz fatura oluşturulmamış
                </p>
              </div>
            ) : (
              invoices.map((invoice) => (
                <div key={invoice.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {invoice.invoiceNumber}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {new Date(invoice.dueDate).toLocaleDateString('tr-TR')}
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {getStatusText(invoice.status)}
                    </div>
                  </div>

                  <div className="text-right mb-4">
                    <p className="text-2xl font-bold text-gray-900">
                      ₺{invoice.amount}
                    </p>
                    <p className="text-sm text-gray-600">
                      {invoice.currency}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                      <div>
                        <span>Vade Tarihi:</span>
                        <span className="font-medium">{new Date(invoice.dueDate).toLocaleDateString('tr-TR')}</span>
                      </div>
                      <div>
                        <span>Ödeme Tarihi:</span>
                        <span className="font-medium">
                          {invoice.paidDate ? new Date(invoice.paidDate).toLocaleDateString('tr-TR') : '-'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {invoice.items && JSON.parse(invoice.items).length} ürün
                      </span>
                      <button
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-2 transition-colors"
                        onClick={() => window.open(`/api/invoices/${invoice.id}`, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                        İndir
                      </button>
                    </div>
                  </div>

                  {invoice.notes && (
                    <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-600">
                      <p className="font-medium mb-1">Notlar:</p>
                      <p>{invoice.notes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BillingHistory;
