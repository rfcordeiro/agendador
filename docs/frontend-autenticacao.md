# Autenticação e Conta do Usuário no Frontend

## Objetivo
Descrever como o frontend React/Vite vai lidar com login, sessão e troca de senha usando o usuário já existente no Django/DRF.

## Páginas/Rotas
- `/login`: formulário com email/usuário + senha, validação básica e feedback de erro genérico. Link para recuperar senha (futuro).
- Layout autenticado (`/app`): aplica guardião que checa sessão; se token inválido, redireciona para `/login`.
- `/minha-conta`: mostra nome/email e permite trocar senha (senha atual, nova, confirmação). Alerta de sucesso/erro e requisitos de senha.

## Fluxo de Sessão
- Login chama endpoint de autenticação (DRF Token/JWT). Ideal: cookie httpOnly + refresh; alternativa: Bearer guardado em `localStorage` com expiração curta.
- Após login, chamar `/api/auth/me` para hidratar usuário + claims (roles/permissões). Guardar no estado global (`useAuth` + context).
- Guardião de rotas: enquanto carrega `/me`, mostrar spinner; se 401, limpar token e enviar para `/login`.
- Logout: limpar token/cookie e contexto; opcional chamar `/api/auth/logout` se expuser refresh/invalidação.

## Troca de Senha
- Endpoint: `/api/auth/password/change/` com `old_password` e `new_password`.
- UI: formulário em `/minha-conta` com validação imediata (tamanho mínimo, complexidade), botão desabilitado enquanto envia, mensagens claras de sucesso/erro.
- Auditar feedback: nunca ecoar motivo exato em erro de login, mas pode detalhar erro de troca de senha na UI.

## Autorização (roles/permissões)
- Backend retorna roles (ex.: `admin`, `operador`, `leitor`) ou lista de permissões.
- Helper `can(user, "manage_schedules")` centralizado. Esconder/disable ações quando não permitido e bloquear via guardião de rota/feature.
- No header: mostrar nome + role; menu com “Minha conta” e “Sair”.

## Considerações de UI/UX
- Aderir aos tokens existentes (Space Grotesk/Manrope, primária #1f6feb, acento #f97316).
- Estados carregando/desabilitado visíveis; erros discretos; foco em teclado e aria-labels nos inputs.
- Responsivo: tela de login centralizada; layout autenticado com sidebar recolhível e cards no dashboard.

## Itens para Backend
- Expor endpoints `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/password/change/` (ou equivalentes DRF) com CORS/CSRF configurados para o domínio do frontend.
- Se usar JWT: refresh endpoint e tempo curto de expiração do access; se usar session/cookie, garantir `SameSite` e HTTPS em produção.
