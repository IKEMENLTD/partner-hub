import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { escalationService } from '@/services/escalationService';
import type { CreateEscalationRuleInput, UpdateEscalationRuleInput, EscalationRuleStatus } from '@/services/escalationService';

const RULES_KEY = ['escalation', 'rules'];
const LOGS_KEY = ['escalation', 'logs'];

export function useEscalationRules(params?: { status?: EscalationRuleStatus }) {
  return useQuery({
    queryKey: [...RULES_KEY, params],
    queryFn: () => escalationService.getRules(params),
  });
}

export function useEscalationRule(id: string | undefined) {
  return useQuery({
    queryKey: [...RULES_KEY, id],
    queryFn: () => escalationService.getRule(id!),
    enabled: !!id,
  });
}

export function useCreateEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEscalationRuleInput) => escalationService.createRule(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useUpdateEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateEscalationRuleInput }) =>
      escalationService.updateRule(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useDeleteEscalationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => escalationService.deleteRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RULES_KEY });
    },
  });
}

export function useEscalationLogs() {
  return useQuery({
    queryKey: LOGS_KEY,
    queryFn: () => escalationService.getLogs(),
  });
}
