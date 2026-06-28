import client from './client';

const settingsApi = {
  get: async () => client.get('/settings'),
  update: async (data) => client.put('/settings', data),
};

export default settingsApi;
