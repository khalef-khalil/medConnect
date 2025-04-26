import axios from 'axios';
import { getApiUrl } from '../networkUtils';

// Get the API URL dynamically
const API_URL = getApiUrl();

/**
 * Create axios instance with authorization header
 * @param token - JWT token for authorization
 * @returns Axios instance configured with base URL and authorization header
 */
export const createAxiosInstance = (token: string) => {
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}; 