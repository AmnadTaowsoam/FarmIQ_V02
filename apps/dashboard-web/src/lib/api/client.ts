import { apiClient, getBFFBaseURL } from '../../api';

export { apiClient };
export const getApiBaseURL = () => getBFFBaseURL();
export const apiRequest = apiClient.request.bind(apiClient);
