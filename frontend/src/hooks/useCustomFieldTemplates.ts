import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customFieldTemplateService } from '@/services';
import type { CustomFieldTemplateInput, CustomFieldTemplateFilter } from '@/types';

export function useCustomFieldTemplates(params?: CustomFieldTemplateFilter) {
  return useQuery({
    queryKey: ['custom-field-templates', params],
    queryFn: () => customFieldTemplateService.getAll(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCustomFieldTemplate(id: string | undefined) {
  return useQuery({
    queryKey: ['custom-field-template', id],
    queryFn: () => customFieldTemplateService.getById(id!),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCustomFieldTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CustomFieldTemplateInput) => customFieldTemplateService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-templates'] });
    },
  });
}

export function useDeleteCustomFieldTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customFieldTemplateService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-templates'] });
    },
  });
}

export function useIncrementTemplateUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => customFieldTemplateService.incrementUsage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['custom-field-templates'] });
    },
  });
}
