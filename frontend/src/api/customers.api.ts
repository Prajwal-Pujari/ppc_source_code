import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { Customer } from '@/types/domain.types';

export const getCustomers = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/customers', { params });
  return res.data;
};

export const getCustomer = async (id: string) => {
  const res = await api.get<ApiResponse<Customer>>(`/customers/${id}`);
  return res.data;
};

export const createCustomer = async (data: Partial<Customer>) => {
  const res = await api.post<ApiResponse<Customer>>('/customers', data);
  return res.data;
};

export const updateCustomer = async (id: string, data: Partial<Customer>) => {
  const res = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data);
  return res.data;
};

export const deleteCustomer = async (id: string) => {
  const res = await api.delete<ApiResponse<void>>(`/customers/${id}`);
  return res.data;
};
