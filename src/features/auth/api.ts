import { apiClient } from '@/lib/apiClient';

import type { AuthUser, LoginResponse } from './types';

export function login(username: string, password: string) {
    return apiClient.post<LoginResponse>('/auth/login', { username, password });
}

export function fetchMe() {
    return apiClient.get<AuthUser>('/auth/me');
}