/**
 * Tipos TypeScript para escalas e alocações
 */

import type { Profissional, Local, Sala } from './index';

export type OrigemAlocacao = 'sistema' | 'manual' | 'google';
export type StatusAlocacao =
  | 'gerado'
  | 'revisado'
  | 'confirmado'
  | 'ajustado'
  | 'manual';
export type NivelInseguranca = 'baixa' | 'media' | 'alta';
export type TurnoEscala = 'manha' | 'tarde';

export interface ValidationIssue {
  severity: 'ERROR' | 'WARNING';
  message: string;
  field?: string;
}

export interface Alocacao {
  id: number;
  profissional: number;
  profissional_detail?: Profissional;
  local: number;
  local_detail?: Local;
  sala: number;
  sala_detail?: Sala;
  data: string; // ISO date string
  turno: TurnoEscala;
  origem: OrigemAlocacao;
  status: StatusAlocacao;
  inseguranca: NivelInseguranca;
  metadata: Record<string, unknown>;
  observacoes: string;
  validation_issues?: ValidationIssue[];
  created_at: string;
  updated_at: string;
}

export type TipoJob =
  | 'geracao_semanal'
  | 'confirmacao_diaria'
  | 'sync_google'
  | 'publicacao_google'
  | 'replanejamento';

export type StatusJob =
  | 'pendente'
  | 'executando'
  | 'concluido'
  | 'erro'
  | 'cancelado';

export interface ExecucaoJob {
  id: number;
  tipo: TipoJob;
  status: StatusJob;
  iniciou_em: string;
  terminou_em: string | null;
  diff_resumo: string;
  log_json: Record<string, unknown>;
  autor: string;
}

export type AcaoPrompt =
  | 'gerar'
  | 'ajustar'
  | 'balancear'
  | 'limpar_futuro'
  | 'custom';

export interface PromptHistory {
  id: number;
  prompt_texto: string;
  resposta: string;
  acao: AcaoPrompt;
  diff_resumo: string;
  publicada: boolean;
  autor: string;
  plataforma: string; // 'codex', 'claude-code', 'opencode'
  log_execucao: string;
  created_at: string;
}

export type StatusTroca = 'registrada' | 'aplicada' | 'cancelada';

export interface Troca {
  id: number;
  data: string;
  turno: TurnoEscala;
  local: number | null;
  local_detail?: Local;
  sala: number | null;
  sala_detail?: Sala;
  profissional_origem: number;
  profissional_origem_detail?: Profissional;
  profissional_destino: number;
  profissional_destino_detail?: Profissional;
  motivo: string;
  origem: string;
  status: StatusTroca;
  created_at: string;
  updated_at: string;
}

export interface AgendaGoogle {
  id: number;
  profissional: number | null;
  profissional_detail?: Profissional;
  calendar_id: string;
  nome: string;
  ultima_sync: string | null;
  source_tag: string;
  pode_publicar: boolean;
  ativa: boolean;
  created_at: string;
  updated_at: string;
}

export type OrigemEvento = 'sistema' | 'manual' | 'google';
export type StatusEvento = 'gravado' | 'atualizado' | 'conflito' | 'deletado';

export interface EventoCalendar {
  id: number;
  agenda: number;
  agenda_detail?: AgendaGoogle;
  alocacao: number | null;
  alocacao_detail?: Alocacao;
  google_event_id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  status: StatusEvento;
  origem: OrigemEvento;
  data_sync: string;
  metadata: Record<string, unknown>;
}

export interface Inconsistencia {
  alocacao_id: number;
  profissional: string;
  local: string;
  data: string;
  turno: string;
  issues: ValidationIssue[];
}

export interface DashboardMetrics {
  periodo: {
    inicio: string;
    fim: string;
    semanas: number;
  };
  profissionais: {
    nome: string;
    total_turnos: number;
    horas_total: number;
    locais: Record<string, number>;
    dobras: number;
  }[];
}

// Filtros para alocações
export interface AlocacaoFilters {
  profissional?: number;
  local?: number;
  sala?: number;
  data?: string;
  data_inicio?: string;
  data_fim?: string;
  turno?: TurnoEscala;
  status?: StatusAlocacao;
  origem?: OrigemAlocacao;
  profissionais?: number[];
  locais?: number[];
}

// Parâmetros para geração de escala
export interface GerarEscalaParams {
  data_inicio: string;
  semanas?: number;
  forcar_regeneracao?: boolean;
}

// Resposta de sincronização
export interface SyncResponse {
  message: string;
  ultima_sync: string;
  eventos_criados?: number;
  eventos_atualizados?: number;
  conflitos?: number;
}
