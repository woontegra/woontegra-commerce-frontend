export const AUTH_LOGIN_EVENT = 'woontegra:auth-login';
export const AUTH_LOGOUT_EVENT = 'woontegra:auth-logout';

export function notifyAuthLogin(): void {
  window.dispatchEvent(new CustomEvent(AUTH_LOGIN_EVENT));
}

export function notifyAuthLogout(): void {
  window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
}
