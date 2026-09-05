const ACCESS_TOKEN_KEY = 'crm_access_token';

export const TokenUtil = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },

  setAccessToken(token: string): void {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },

  removeAccessToken(): void {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
};
