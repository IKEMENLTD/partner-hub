import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { partnerService } from '@/services';
import type { PartnerInput, PartnerFilter } from '@/types';

interface UsePartnersParams extends PartnerFilter {
  page?: number;
  pageSize?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export function usePartners(params?: UsePartnersParams) {
  return useQuery({
    queryKey: ['partners', params],
    queryFn: () => partnerService.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartner(id: string | undefined) {
  return useQuery({
    queryKey: ['partner', id],
    queryFn: () => partnerService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function usePartnerProjects(partnerId: string | undefined) {
  return useQuery({
    queryKey: ['partner-projects', partnerId],
    queryFn: () => partnerService.getProjects(partnerId!),
    enabled: !!partnerId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PartnerInput) => partnerService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}

export function useUpdatePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PartnerInput> }) =>
      partnerService.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
      queryClient.invalidateQueries({ queryKey: ['partner', id] });
    },
  });
}

export function useDeletePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => partnerService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners'] });
    },
  });
}
