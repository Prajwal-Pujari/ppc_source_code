import api from '@/lib/axios';

export interface EmailConfiguration {
  id?: string;
  factoryId?: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  encryptionType: string;
  senderEmail: string;
  isActive: boolean;
}

export const emailSettingsApi = {
  getConfiguration: async (factoryId: string) => {
    const res = await api.get(`/settings/email/${factoryId}`);
    return res.data;
  },

  saveConfiguration: async (factoryId: string, data: EmailConfiguration) => {
    const res = await api.put(`/settings/email/${factoryId}`, data);
    return res.data;
  },

  testConnection: async (factoryId: string, testEmailAddress: string) => {
    const res = await api.post(`/settings/email/${factoryId}/test`, { testEmailAddress });
    return res.data;
  }
};
