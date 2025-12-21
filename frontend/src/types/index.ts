export interface User {
  id: number;
  username: string;
  name: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isSuperuser: boolean;
}

export type UserPayload = Partial<User> & {
  is_staff?: boolean;
  is_superuser?: boolean;
  roles?: unknown;
  permissions?: unknown;
};

export interface AuthState {
  token: string;
  user: User;
}

export interface AuthError {
  message: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
}

export interface ChangeEmailInput {
  email: string;
}

export interface ResetToken {
  uid: string;
  token: string;
}

export interface Local {
  id: number;
  nome: string;
  area: string;
  endereco: string;
  observacao: string;
  prioridade_cobertura: number;
  tipo: LocalTipo;
  manha_inicio: string;
  manha_fim: string;
  tarde_inicio: string;
  tarde_fim: string;
  sabado_inicio: string;
  sabado_fim: string;
  ativo: boolean;
}

export type LocalTipo = 'associacao' | 'evento' | 'clinica';

export interface Sala {
  id: number;
  local: number;
  nome: string;
  ativa: boolean;
}

export interface CapacidadeSala {
  id: number;
  sala: number;
  dia_semana: number | null;
  turno: string;
  capacidade: number;
  restricoes?: string;
}

export interface CapacityGridRow {
  dia_semana: number;
  manha: string;
  tarde: string;
}

export interface ProfissionalCadastro {
  id: number;
  nome: string;
  email: string;
  turno_preferencial: string;
  google_calendar_id: string;
  classificacao: string;
  valor_diaria: number | null;
  valor_salario_mensal: number | null;
  valor_vale_transporte: number | null;
  comissao_sabado: number | null;
  cpf: string;
  cnpj: string;
  celular: string;
  banco_nome: string;
  banco_agencia: string;
  banco_conta: string;
  link_contrato: string;
  nome_empresarial: string;
  endereco_empresa: string;
  cnae: string;
  inscricao_municipal: string;
  data_contrato: string | null;
  carga_semanal_alvo: number;
  limite_dobras_semana: number;
  tags: string[];
  destacado: boolean;
  locais_preferidos: number[];
  locais_proibidos: number[];
}

// Alias para compatibilidade com módulo escala
export type Profissional = ProfissionalCadastro;

export interface ProfissionalFormState {
  nome: string;
  email: string;
  turno_preferencial: string;
  classificacao: string;
  valor_diaria: string;
  valor_salario_mensal: string;
  valor_vale_transporte: string;
  comissao_sabado: string;
  cpf: string;
  cnpj: string;
  celular: string;
  banco_nome: string;
  banco_agencia: string;
  banco_conta: string;
  link_contrato: string;
  nome_empresarial: string;
  endereco_empresa: string;
  cnae: string;
  inscricao_municipal: string;
  data_contrato: string;
  carga_semanal_alvo: number;
  limite_dobras_semana: number;
  google_calendar_id: string;
  tags: string;
  destacado: boolean;
  locais_preferidos: number[];
  locais_proibidos: number[];
}

export interface PremissasGlobais {
  id?: number;
  janela_planejamento_semanas: number;
  limite_dobras_semana: number;
  limite_horas_semana: number;
  politica_revezamento: string;
  confirmacao_diaria: boolean;
  observacoes: string;
}

export interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  description?: string;
}

export type AuthScreen = 'login' | 'reset-request' | 'reset-confirm';
export type Page =
  | 'dashboard'
  | 'account'
  | 'profissionais'
  | 'locais'
  | 'premissas';
export type QuickActionTone = 'primary' | 'secondary' | 'ghost';

export interface QuickAction {
  label: string;
  tone: QuickActionTone;
  permission?: string | string[];
}

export interface PermissionWidgetProps {
  roles: string[];
  permissions: string[];
  isStaff: boolean;
  isSuperuser: boolean;
}
