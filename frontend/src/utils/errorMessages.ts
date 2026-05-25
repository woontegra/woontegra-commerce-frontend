// User-friendly error messages
export const errorMessages = {
  // Network errors
  'Network Error': 'İnternet bağlantınızı kontrol edin',
  'ERR_NETWORK': 'İnternet bağlantınızı kontrol edin',
  
  // Authentication errors
  401: 'Oturum süreniz doldu, lütfen tekrar giriş yapın',
  403: 'Bu işlem için yetkiniz yok',
  
  // Not found
  404: 'İstediğiniz kayıt bulunamadı',
  
  // Server errors
  500: 'Sunucu hatası oluştu, lütfen tekrar deneyin',
  502: 'Sunucuya ulaşılamıyor',
  503: 'Servis geçici olarak kullanılamıyor',
  
  // Validation errors
  400: 'Girdiğiniz bilgileri kontrol edin',
  422: 'Girdiğiniz bilgiler geçersiz',
  
  // Conflict
  409: 'Bu kayıt zaten mevcut',
  
  // Default
  default: 'Bir hata oluştu, lütfen tekrar deneyin',
};

export function getErrorMessage(error: any): string {
  // Network error
  if (error.message === 'Network Error' || error.code === 'ERR_NETWORK') {
    return errorMessages['Network Error'];
  }
  
  // HTTP status code
  if (error.response?.status) {
    const status = error.response.status;
    return errorMessages[status as keyof typeof errorMessages] || errorMessages.default;
  }
  
  // Custom error message from backend
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Default
  return errorMessages.default;
}
