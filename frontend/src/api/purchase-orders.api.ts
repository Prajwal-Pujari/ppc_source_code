import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api.types';
import type { PurchaseOrder, Gauge, PoLineItem } from '@/types/domain.types';

export const getPurchaseOrders = async (params?: Record<string, any>) => {
  const res = await api.get<ApiResponse<any>>('/purchase-orders', { params });
  return res.data;
};

export const getPurchaseOrder = async (id: string) => {
  const res = await api.get<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`);
  return res.data;
};

export const createPurchaseOrder = async (data: any) => {
  const res = await api.post<ApiResponse<PurchaseOrder>>('/purchase-orders', data);
  return res.data;
};

export const confirmPurchaseOrder = async (id: string) => {
  const res = await api.post<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}/confirm`);
  return res.data;
};

export const getPurchaseOrderGauges = async (id: string) => {
  const res = await api.get<ApiResponse<Gauge[]>>(`/purchase-orders/${id}/gauges`);
  return res.data;
};

export const getPurchaseOrderLineItems = async (id: string) => {
  const res = await api.get<ApiResponse<any[]>>(`/purchase-orders/${id}/line-items`);
  return res.data;
};

export const cancelPurchaseOrder = async (id: string): Promise<void> => {
  await api.delete(`/purchase-orders/${id}`);
};

export const updatePurchaseOrder = async (id: string, data: { orderDate?: string; expectedDeliveryDate?: string }): Promise<PurchaseOrder> => {
  const response = await api.put<ApiResponse<PurchaseOrder>>(`/purchase-orders/${id}`, data);
  return response.data.data;
};

export const updateLineItem = async (poId: string, lineItemId: string, data: { quantity?: number }): Promise<PoLineItem> => {
  const response = await api.put<ApiResponse<PoLineItem>>(`/purchase-orders/${poId}/line-items/${lineItemId}`, data);
  return response.data.data;
};

export const updateLineItemOperation = async (poId: string, lineItemId: string, opId: string, data: any) => {
  const res = await api.put<ApiResponse<any>>(`/purchase-orders/${poId}/line-items/${lineItemId}/operations/${opId}`, data);
  return res.data;
};
