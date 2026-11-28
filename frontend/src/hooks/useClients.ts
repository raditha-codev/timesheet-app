import { useQuery } from '@tanstack/react-query';
import apiClient from '../api/client';
import type { Client } from '../types/api';

export const CLIENTS_KEY = ['clients'] as const;

export const useClients = () =>
  useQuery<{ clients: Client[] }>({
    queryKey: CLIENTS_KEY,
    queryFn: () => apiClient.getClients(),
  });
