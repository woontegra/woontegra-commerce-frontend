import React, { useState, useEffect } from 'react';
import { Play, Package, Users, ShoppingCart, TrendingUp, ArrowRight, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import DemoTimer from '../components/DemoTimer';

interface DemoData {
  products: any[];
  orders: any[];
  customers: any[];
  stats: {
    totalRevenue: number;
    totalOrders: number;
    totalCustomers: number;
    averageOrderValue: number;
  };
}

const DemoDashboard: React.FC = () => {
  const [demoData, setDemoData] = useState<DemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoStarted, setDemoStarted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has valid demo token
    const token = localStorage.getItem('token');
    const isDemo = localStorage.getItem('isDemo');
    
    if (!token || isDemo !== 'true') {
      navigate('/');
      return;
    }

    // Check if token is expired
    try {
      const decoded = JSON.parse(atob(token));
      if (decoded.exp < Date.now()) {
        toast.error('Demo süresi doldu. Lütfen tekrar demo başlatın.');
        localStorage.removeItem('token');
        localStorage.removeItem('isDemo');
        navigate('/');
        return;
      }
    } catch (error) {
      navigate('/');
      return;
    }

    if (demoStarted) {
      generateDemoData();
    }
  }, [demoStarted, navigate]);

  const generateDemoData = async () => {
    setLoading(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockData: DemoData = {
      products: [
        {
          id: 'demo-1',
          name: 'T-Shirt Demo',
          price: 299,
          stock: 50,
          status: 'active',
          image: 'https://via.placeholder.com/100x100/3B82F6/FFFFFF?text=T-Shirt',
          category: 'Giyim',
          variants: ['S', 'M', 'L', 'XL'],
          description: 'Demo ürün açıklaması'
        },
        {
          id: 'demo-2',
          name: 'Laptop Demo',
          price: 8999,
          stock: 15,
          status: 'active',
          image: 'https://via.placeholder.com/100x100/10B981/FFFFFF?text=Laptop',
          category: 'Teknoloji',
          variants: ['Standart'],
          description: 'Demo laptop açıklaması'
        },
        {
          id: 'demo-3',
          name: 'Kitap Demo',
          price: 89,
          stock: 100,
          status: 'active',
          image: 'https://via.placeholder.com/100x100/F59E0B/FFFFFF?text=Kitap',
          category: 'Kitap',
          variants: ['Ciltli', 'İnce Kapak'],
          description: 'Demo kitap açıklaması'
        }
      ],
      orders: [
        {
          id: 'order-1',
          orderNumber: 'DEMO-001',
          customerName: 'Ahmet Yılmaz',
          total: 598,
          status: 'delivered',
          date: '2024-01-15',
          items: ['T-Shirt Demo x2']
        },
        {
          id: 'order-2',
          orderNumber: 'DEMO-002',
          customerName: 'Ayşe Kaya',
          total: 8999,
          status: 'processing',
          date: '2024-01-16',
          items: ['Laptop Demo x1']
        },
        {
          id: 'order-3',
          orderNumber: 'DEMO-003',
          customerName: 'Mehmet Demir',
          total: 178,
          status: 'pending',
          date: '2024-01-17',
          items: ['Kitap Demo x2']
        }
      ],
      customers: [
        {
          id: 'cust-1',
          name: 'Ahmet Yılmaz',
          email: 'ahmet@demo.com',
          phone: '555-123-4567',
          totalOrders: 3,
          totalSpent: 1250,
          status: 'active'
        },
        {
          id: 'cust-2',
          name: 'Ayşe Kaya',
          email: 'ayse@demo.com',
          phone: '555-987-6543',
          totalOrders: 1,
          totalSpent: 8999,
          status: 'active'
        },
        {
          id: 'cust-3',
          name: 'Mehmet Demir',
          email: 'mehmet@demo.com',
          phone: '555-456-7890',
          totalOrders: 2,
          totalSpent: 356,
          status: 'active'
        }
      ],
      stats: {
        totalRevenue: 9775,
        totalOrders: 3,
        totalCustomers: 3,
        averageOrderValue: 3258
      }
    };

    setDemoData(mockData);
    setLoading(false);
  };

  const handleStartDemo = async () => {
    try {
      const response = await fetch('/api/demo/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDemoStarted(true);
      }
    } catch (error) {
      console.error('Failed to start demo:', error);
    }
  };

  const handleTimeUp = () => {
    // Demo süresi dolduğunda yapılacak işlemler
    console.log('Demo süresi doldu');
  };

  const handleTimeWarning = (minutes: number) => {
    // Demo süresi azaldığında uyarı
    console.log(`Demo süresi ${minutes} dakika kaldı`);
  };

  if (!demoStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Woontegra Demo
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              30 dakika boyunca Woontegra'nın tüm özelliklerini ücretsiz deneyin
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Play className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Demo Modunu Başlat
              </h2>
              <p className="text-gray-600 mb-6">
                Demo modunda aşağıdaki özellikleri deneyebilirsiniz:
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-semibold text-green-900 mb-2">✅ Mevcut Özellikler</h3>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• 5 ürün ekleme</li>
                  <li>• 3 sipariş oluşturma</li>
                  <li>• 10 müşteri ekleme</li>
                  <li>• Temel raporlar</li>
                  <li>• Ürün yönetimi</li>
                </ul>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <h3 className="font-semibold text-red-900 mb-2">❌ Kısıtlı Özellikler</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• API erişimi</li>
                  <li>• Veri dışa aktarma</li>
                  <li>• Entegrasyonlar</li>
                  <li>• Gelişmiş raporlar</li>
                  <li>• Sınırsız ürün</li>
                </ul>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">30</span>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">30 Dakika</h3>
                  <p className="text-blue-700 text-sm">
                    Demo süreniz 30 dakika boyunca geçerlidir
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={handleStartDemo}
                className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2 text-lg mx-auto"
              >
                <Play className="w-5 h-5" />
                Demo'yu Başlat
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Kredi kartı gerekmez • Ücretsiz deneme
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Demo verileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Demo Timer */}
        <div className="mb-8">
          <DemoTimer 
            onTimeUp={handleTimeUp}
            onTimeWarning={handleTimeWarning}
          />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+12%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              ₺{demoData?.stats.totalRevenue.toLocaleString()}
            </h3>
            <p className="text-gray-600 text-sm">Toplam Ciro</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-green-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+8%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {demoData?.stats.totalOrders}
            </h3>
            <p className="text-gray-600 text-sm">Toplam Sipariş</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+15%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              {demoData?.stats.totalCustomers}
            </h3>
            <p className="text-gray-600 text-sm">Toplam Müşteri</p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <span className="text-sm text-green-600 font-medium">+5%</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900">
              ₺{demoData?.stats.averageOrderValue.toLocaleString()}
            </h3>
            <p className="text-gray-600 text-sm">Ortalama Sepet</p>
          </div>
        </div>

        {/* Products Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Ürünler</h3>
            <div className="space-y-3">
              {demoData?.products.map((product) => (
                <div key={product.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-600">₺{product.price} • Stok: {product.stock}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      {product.status}
                    </span>
                    <button
                      onClick={() => toast.error('Demo modunda bu işlem kapalıdır')}
                      className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
                      title="Demo modunda kapalı"
                    >
                      <Lock className="w-3 h-3" />
                      Düzenle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Demo Siparişler</h3>
            <div className="space-y-3">
              {demoData?.orders.map((order) => (
                <div key={order.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium text-gray-900">{order.orderNumber}</h4>
                      <p className="text-sm text-gray-600">{order.customerName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {order.status}
                      </span>
                      <button
                        onClick={() => toast.error('Demo modunda bu işlem kapalıdır')}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full hover:bg-gray-200 transition-colors flex items-center gap-1"
                        title="Demo modunda kapalı"
                      >
                        <Lock className="w-3 h-3" />
                        Düzenle
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{order.items.join(', ')}</p>
                    <p className="font-semibold text-gray-900">₺{order.total}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Upgrade CTA */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">
            Demo'dan Tam Sürüme Geçin
          </h2>
          <p className="text-white/90 mb-6 max-w-2xl mx-auto">
            30 dakikalık demo süreniz bittiğinde Woontegra'nın tüm özelliklerine sınırsız erişim sağlayın. 
            Sınırsız ürün, API erişimi, gelişmiş raporlar ve daha fazlası!
          </p>
          <button
            onClick={() => window.location.href = '/register'}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            Şimdi Kaydol
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DemoDashboard;
