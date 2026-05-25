// Mock analytics data generator
export interface AnalyticsData {
  date: string;
  sales: number;
  orders: number;
}

const generateMockData = (days: number): AnalyticsData[] => {
  const data: AnalyticsData[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // Realistic patterns: higher on weekends, random variations
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const baseOrders = isWeekend ? 45 : 30;
    const baseSales = isWeekend ? 4500 : 3000;
    
    // Add some randomness
    const orderVariation = Math.random() * 20 - 10;
    const salesVariation = Math.random() * 2000 - 1000;
    
    data.push({
      date: date.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
      sales: Math.round(baseSales + salesVariation),
      orders: Math.round(baseOrders + orderVariation),
    });
  }
  
  return data;
};

export const getAnalyticsData = (period: 'today' | '7days' | '30days'): AnalyticsData[] => {
  switch (period) {
    case 'today':
      return [{
        date: new Date().toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' }),
        sales: 3250,
        orders: 28,
      }];
    case '7days':
      return generateMockData(7);
    case '30days':
      return generateMockData(30);
    default:
      return generateMockData(7);
  }
};

export const getStatsSummary = (period: 'today' | '7days' | '30days') => {
  const data = getAnalyticsData(period);
  
  const totalSales = data.reduce((sum, item) => sum + item.sales, 0);
  const totalOrders = data.reduce((sum, item) => sum + item.orders, 0);
  const avgSales = Math.round(totalSales / data.length);
  const avgOrders = Math.round(totalOrders / data.length);
  
  return {
    totalSales,
    totalOrders,
    avgSales,
    avgOrders,
  };
};
