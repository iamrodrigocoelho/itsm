import axios from 'axios';
import type {
  LoginRequestDto,
  LoginResponseDto,
  RefreshResponseDto,
  UserDetailDto,
  UserSummaryDto,
  PaginatedResponseDto,
  AuditLogDto,
  CsvImportJobDto,
  CreateUserDto,
  UpdateUserDto,
  ServiceCatalogDto,
  CreateTicketDto,
  TicketSummaryDto,
  TicketDetailDto,
} from '@itsm/shared-types';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token from storage on each request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// Refresh token on 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post<RefreshResponseDto>('/api/auth/refresh', { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          original.headers['Authorization'] = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export const authApi = {
  login: (data: LoginRequestDto) => api.post<LoginResponseDto>('/auth/login', data),
  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } }),
  refresh: (refreshToken: string) => api.post<RefreshResponseDto>('/auth/refresh', { refreshToken }),
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword, confirmPassword }),
  me: () => api.get<UserSummaryDto>('/auth/me'),
};

export const usersApi = {
  list: (params: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    api.get<PaginatedResponseDto<UserSummaryDto>>('/users', { params }).then((r) => r.data),
  getById: (id: string) => api.get<UserDetailDto>(`/users/${id}`).then((r) => r.data),
  create: (data: CreateUserDto) => api.post<UserDetailDto>('/users', data).then((r) => r.data),
  update: (id: string, data: UpdateUserDto) =>
    api.patch<UserDetailDto>(`/users/${id}`, data).then((r) => r.data),
  softDelete: (id: string) => api.delete(`/users/${id}`),
  setManager: (userId: string, managerId: string) =>
    api.patch<UserDetailDto>(`/users/${userId}/manager`, { managerId }).then((r) => r.data),
  removeManager: (userId: string) => api.delete(`/users/${userId}/manager`),
  importCsv: (data: { filename: string; content: string }) =>
    api.post<CsvImportJobDto>('/users/import-csv', data).then((r) => r.data),
  getImportJob: (id: string) =>
    api.get<CsvImportJobDto>(`/users/import-jobs/${id}`).then((r) => r.data),
};

export const auditApi = {
  list: (params: {
    page?: number; limit?: number; entityType?: string; entityId?: string;
    action?: string; actorUserId?: string; from?: string; to?: string;
  }) =>
    api.get<PaginatedResponseDto<AuditLogDto>>('/audit-logs', { params }).then((r) => r.data),
};

export const catalogsApi = {
  list: (params?: { ativo?: boolean }) =>
    api.get<ServiceCatalogDto[]>('/catalogs', { params }).then((r) => r.data),
  getBySlug: (slug: string) =>
    api.get<ServiceCatalogDto>(`/catalogs/${slug}`).then((r) => r.data),
};

export const ticketsApi = {
  create: (data: CreateTicketDto) =>
    api.post<TicketDetailDto>('/tickets', data).then((r) => r.data),
  list: (params?: {
    page?: number; limit?: number; status?: string; catalogSlug?: string; requesterId?: string;
  }) =>
    api.get<PaginatedResponseDto<TicketSummaryDto>>('/tickets', { params }).then((r) => r.data),
  getById: (id: string) =>
    api.get<TicketDetailDto>(`/tickets/${id}`).then((r) => r.data),
  cancel: (id: string, comment?: string) =>
    api.post<TicketDetailDto>(`/tickets/${id}/cancel`, { comment }).then((r) => r.data),
  approve: (id: string, comment?: string) =>
    api.post<TicketDetailDto>(`/tickets/${id}/approve`, { comment }).then((r) => r.data),
  reject: (id: string, reason: string) =>
    api.post<TicketDetailDto>(`/tickets/${id}/reject`, { reason }).then((r) => r.data),
  reprocess: (id: string) =>
    api.post<TicketDetailDto>(`/tickets/${id}/reprocess`).then((r) => r.data),
};
