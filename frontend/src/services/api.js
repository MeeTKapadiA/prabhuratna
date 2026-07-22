const rawBaseUrl = import.meta.env.VITE_API_URL || '/api';
const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '');

export async function apiRequest(endpoint, method = 'GET', data = null, customHeaders = {}) {
  const token = localStorage.getItem('prabhuratna_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers
  };

  if (data && method !== 'GET') {
    config.body = JSON.stringify(data);
  }

  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const requestUrl = `${API_BASE_URL}${cleanEndpoint}`;

  try {
    const response = await fetch(requestUrl, config);
    
    // Check if response has content-type application/json
    const contentType = response.headers.get('content-type');
    let result;

    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // Non-JSON response (e.g., HTML 404 page from static host fallback)
      const text = await response.text();
      console.error(`Non-JSON Response (${response.status}) from ${requestUrl}:`, text.slice(0, 200));

      if (!response.ok || text.includes('<!DOCTYPE html>')) {
        throw new Error(`API server endpoint unreachable (${response.status}). If backend is hosted separately, set VITE_API_URL in environment variables.`);
      }
      throw new Error('Server returned invalid non-JSON format.');
    }

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('prabhuratna_token');
        localStorage.removeItem('prabhuratna_user');
      }
      throw new Error(result.message || `API request failed with status ${response.status}`);
    }

    return result;
  } catch (error) {
    console.error(`API Error (${method} ${requestUrl}):`, error);
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Network Error: Cannot connect to backend server. Please check internet connection or server status.');
    }
    throw error;
  }
}
