let baseUrl = 'http://192.168.18.128:4000';

export function getApiBaseUrl() {
  return baseUrl;
}

export function setApiBaseUrl(url: string) {
  baseUrl = url.trim().replace(/\/+$/, '');
}
