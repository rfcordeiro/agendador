import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import { ProfissionalCadastro, ProfissionalFormState, Local } from '../types';
import {
  fetchProfissionais,
  fetchLocais,
  updateProfissional,
  createProfissional,
} from '../lib/api';
import { Modal } from '../components/ui/Modal';

const classificacoes = [
  { value: 'estagiaria', label: 'Estagiária', badgeClass: 'badge-estagiaria' },
  { value: 'mei', label: 'MEI', badgeClass: 'badge-mei' },
  { value: 'freelancer', label: 'Freelancer', badgeClass: 'badge-freelancer' },
];

export function ProfissionaisPage() {
  const [profissionais, setProfissionais] = useState<ProfissionalCadastro[]>(
    [],
  );
  const [locais, setLocais] = useState<Local[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProfissionalFormState>({
    nome: '',
    email: '',
    turno_preferencial: '',
    classificacao: 'estagiaria',
    valor_diaria: '',
    valor_salario_mensal: '',
    valor_vale_transporte: '',
    comissao_sabado: '',
    cpf: '',
    cnpj: '',
    celular: '',
    banco_nome: '',
    banco_agencia: '',
    banco_conta: '',
    link_contrato: '',
    nome_empresarial: '',
    endereco_empresa: '',
    cnae: '',
    inscricao_municipal: '',
    data_contrato: '',
    carga_semanal_alvo: 40,
    limite_dobras_semana: 2,
    google_calendar_id: '',
    tags: '',
    destacado: false,
    locais_preferidos: [] as number[],
    locais_proibidos: [] as number[],
  });
  const [success, setSuccess] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editing, setEditing] = useState<ProfissionalCadastro | null>(null);
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profissionaisData, locaisData] = await Promise.all([
        fetchProfissionais(),
        fetchLocais(),
      ]);
      setProfissionais(profissionaisData);
      setLocais(locaisData);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao carregar cadastros.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const profissionaisDestacados = useMemo(
    () => profissionais.filter((prof) => prof.destacado),
    [profissionais],
  );
  const profissionaisNaoDestacados = useMemo(
    () => profissionais.filter((prof) => !prof.destacado),
    [profissionais],
  );

  const classificacaoByValue = useMemo(
    () =>
      classificacoes.reduce<
        Record<string, { label: string; badgeClass: string }>
      >((accumulator, item) => {
        accumulator[item.value] = {
          label: item.label,
          badgeClass: item.badgeClass,
        };
        return accumulator;
      }, {}),
    [],
  );
  const isEstagiaria = form.classificacao === 'estagiaria';
  const isMeiOuFreelancer =
    form.classificacao === 'mei' || form.classificacao === 'freelancer';
  const salarioDisabled = isMeiOuFreelancer || Boolean(form.valor_diaria);
  const diariaDisabled = isEstagiaria || Boolean(form.valor_salario_mensal);
  const contratoLink = form.link_contrato?.trim() || '';

  useEffect(() => {
    if (isEstagiaria) {
      setForm((prev) => ({
        ...prev,
        valor_diaria: '',
        cnpj: '',
        nome_empresarial: '',
        endereco_empresa: '',
        cnae: '',
        inscricao_municipal: '',
      }));
    }
    if (isMeiOuFreelancer) {
      setForm((prev) => ({
        ...prev,
        valor_salario_mensal: '',
        valor_vale_transporte: '',
      }));
    }
  }, [isEstagiaria, isMeiOuFreelancer]);

  const handleMultiSelect = (
    options: HTMLCollectionOf<HTMLOptionElement>,
  ): number[] =>
    Array.from(options)
      .filter((option) => option.selected)
      .map((option) => Number(option.value));

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const toNumberOrNull = (value: string) => {
        if (value === null || value === undefined) return null;
        const trimmed = value.toString().trim();
        if (!trimmed) return null;
        const parsed = Number(trimmed.replace(',', '.'));
        return Number.isFinite(parsed) ? parsed : null;
      };

      const payload: Partial<ProfissionalCadastro> = {
        ...form,
        valor_diaria: toNumberOrNull(form.valor_diaria),
        valor_salario_mensal: toNumberOrNull(form.valor_salario_mensal),
        valor_vale_transporte: toNumberOrNull(form.valor_vale_transporte),
        comissao_sabado: toNumberOrNull(form.comissao_sabado),
        data_contrato: form.data_contrato || null,
        destacado: form.destacado,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
      };
      if (editing) {
        const updated = await updateProfissional(editing.id, payload);
        setProfissionais((prev) =>
          prev.map((prof) => (prof.id === updated.id ? updated : prof)),
        );
        setSuccess('Profissional atualizado.');
        setEditing(null);
      } else {
        const created = await createProfissional(payload);
        setProfissionais((prev) => [...prev, created]);
        setSuccess('Profissional cadastrado.');
      }
      setForm({
        nome: '',
        email: '',
        turno_preferencial: '',
        classificacao: 'estagiaria',
        valor_diaria: '',
        valor_salario_mensal: '',
        valor_vale_transporte: '',
        comissao_sabado: '',
        cpf: '',
        cnpj: '',
        celular: '',
        banco_nome: '',
        banco_agencia: '',
        banco_conta: '',
        link_contrato: '',
        nome_empresarial: '',
        endereco_empresa: '',
        cnae: '',
        inscricao_municipal: '',
        data_contrato: '',
        carga_semanal_alvo: 40,
        limite_dobras_semana: 2,
        google_calendar_id: '',
        tags: '',
        destacado: false,
        locais_preferidos: [],
        locais_proibidos: [],
      });
      setShowModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar profissional.';
      setError(message);
    }
  };

  const toggleDestaque = async (profissional: ProfissionalCadastro) => {
    setError(null);
    try {
      const updated = await updateProfissional(profissional.id, {
        destacado: !profissional.destacado,
      });
      setProfissionais((prev) =>
        prev.map((prof) => (prof.id === updated.id ? updated : prof)),
      );
      setSuccess(
        updated.destacado
          ? 'Profissional destacado.'
          : 'Profissional removido dos destaques.',
      );
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao atualizar destaque.';
      setError(message);
    } finally {
      setOpenMenuId(null);
    }
  };

  const renderProfissionaisTable = (
    lista: ProfissionalCadastro[],
    emptyMessage: string,
  ) => (
    <table>
      <thead>
        <tr>
          <th>Nome</th>
          <th>Email</th>
          <th>Classificação</th>
          <th>Turno pref.</th>
          <th>Carga alvo (h)</th>
          <th>Dobras/semana</th>
          <th>Tags</th>
          <th>Ações</th>
        </tr>
      </thead>
      <tbody>
        {lista.map((profissional) => (
          <tr key={profissional.id}>
            <td>
              <div className='name-cell'>
                <span>{profissional.nome}</span>
                {profissional.destacado ? (
                  <span className='pill pill-soft small-pill'>Destaque</span>
                ) : null}
              </div>
            </td>
            <td className='muted'>{profissional.email}</td>
            <td>
              {profissional.classificacao ? (
                <span
                  className={`badge-class ${
                    classificacaoByValue[profissional.classificacao]
                      ?.badgeClass ?? ''
                  }`}
                >
                  {classificacaoByValue[profissional.classificacao]?.label ??
                    'Outro'}
                </span>
              ) : (
                <span className='muted'>—</span>
              )}
            </td>
            <td>{profissional.turno_preferencial || '—'}</td>
            <td>{profissional.carga_semanal_alvo}</td>
            <td>{profissional.limite_dobras_semana}</td>
            <td>
              {profissional.tags?.length ? (
                <div className='chip-row inline-chips'>
                  {profissional.tags.map((tag) => (
                    <span key={tag} className='pill pill-soft'>
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className='muted'>—</span>
              )}
            </td>
            <td>
              <div className='actions-inline'>
                <button
                  className='ghost-button small'
                  type='button'
                  onClick={() => {
                    setEditing(profissional);
                    setForm({
                      nome: profissional.nome,
                      email: profissional.email,
                      turno_preferencial: profissional.turno_preferencial,
                      classificacao: profissional.classificacao || 'estagiaria',
                      valor_diaria:
                        profissional.valor_diaria !== null &&
                        profissional.valor_diaria !== undefined
                          ? String(profissional.valor_diaria)
                          : '',
                      valor_salario_mensal:
                        profissional.valor_salario_mensal !== null &&
                        profissional.valor_salario_mensal !== undefined
                          ? String(profissional.valor_salario_mensal)
                          : '',
                      valor_vale_transporte:
                        profissional.valor_vale_transporte !== null &&
                        profissional.valor_vale_transporte !== undefined
                          ? String(profissional.valor_vale_transporte)
                          : '',
                      comissao_sabado:
                        profissional.comissao_sabado !== null &&
                        profissional.comissao_sabado !== undefined
                          ? String(profissional.comissao_sabado)
                          : '',
                      cpf: profissional.cpf || '',
                      cnpj: profissional.cnpj || '',
                      celular: profissional.celular || '',
                      banco_nome: profissional.banco_nome || '',
                      banco_agencia: profissional.banco_agencia || '',
                      banco_conta: profissional.banco_conta || '',
                      link_contrato: profissional.link_contrato || '',
                      nome_empresarial: profissional.nome_empresarial || '',
                      endereco_empresa: profissional.endereco_empresa || '',
                      cnae: profissional.cnae || '',
                      inscricao_municipal:
                        profissional.inscricao_municipal || '',
                      data_contrato: profissional.data_contrato || '',
                      carga_semanal_alvo: profissional.carga_semanal_alvo,
                      limite_dobras_semana: profissional.limite_dobras_semana,
                      google_calendar_id: profissional.google_calendar_id,
                      tags: (profissional.tags || []).join(', '),
                      destacado: profissional.destacado,
                      locais_preferidos: profissional.locais_preferidos || [],
                      locais_proibidos: profissional.locais_proibidos || [],
                    });
                    setShowModal(true);
                  }}
                >
                  Editar
                </button>
                <div className='actions-menu'>
                  <button
                    className='ghost-button small icon-only'
                    type='button'
                    aria-haspopup='menu'
                    aria-expanded={openMenuId === profissional.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuId(
                        openMenuId === profissional.id ? null : profissional.id,
                      );
                    }}
                  >
                    :
                  </button>
                  {openMenuId === profissional.id ? (
                    <div className='actions-menu-panel' role='menu'>
                      <button
                        type='button'
                        className='menu-item'
                        onClick={(event) => {
                          event.stopPropagation();
                          void toggleDestaque(profissional);
                        }}
                      >
                        {profissional.destacado
                          ? 'Remover destaque'
                          : 'Destacar'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </td>
          </tr>
        ))}
        {!lista.length ? (
          <tr>
            <td colSpan={8} className='muted'>
              {emptyMessage}
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  );

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Profissionais</h2>
          <p className='lede'>
            Tabela com um profissional por linha. Edição virá em ações por
            registro.
          </p>
        </div>
        <div className='panel-actions'>
          <button
            className='primary-button'
            type='button'
            onClick={() => setShowModal(true)}
          >
            + Adicionar
          </button>
          <button
            className='ghost-button small'
            type='button'
            onClick={() => setShowHelp(true)}
          >
            ?
          </button>
        </div>
      </div>
      {error ? <div className='alert'>{error}</div> : null}
      {success ? <div className='success'>{success}</div> : null}
      {loading ? (
        <p className='muted'>Carregando profissionais...</p>
      ) : (
        <div className='table-stack'>
          <div className='table-card'>
            <div className='table-card__header'>
              <h3>Profissionais destacados</h3>
              <p className='muted small-print'>
                Aparecem primeiro na tela e nas ações rápidas.
              </p>
            </div>
            {renderProfissionaisTable(
              profissionaisDestacados,
              'Nenhum destaque ainda.',
            )}
          </div>
          <div className='table-card'>
            <div className='table-card__header'>
              <h3>Demais profissionais</h3>
              <p className='muted small-print'>
                Continuam acessíveis normalmente.
              </p>
            </div>
            {renderProfissionaisTable(
              profissionaisNaoDestacados,
              'Nenhum profissional cadastrado.',
            )}
          </div>
        </div>
      )}

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como cadastrar profissionais'
        description='Campos essenciais e como serão usados.'
      >
        <ul className='help-list'>
          <li>
            Profissional é a pessoa que atende; nome e email são usados para
            login e notificações.
          </li>
          <li>
            Turno preferencial é opcional; carga alvo até 70h e limite de dobras
            evitam excesso de alocação.
          </li>
          <li>
            Classificação diferencia Estagiária, MEI ou Freelancer para regras
            de alocação e fica visível nos badges da tabela.
          </li>
          <li>
            Diária é usada para MEI/Freelancer; salário e vale transporte são
            para Estagiária. Preencher um zera o outro campo automaticamente.
          </li>
          <li>
            CPF sempre é aceito; CNPJ e dados empresariais só se forem
            MEI/Freelancer.
          </li>
          <li>
            Link do contrato aceita URL do Drive com atalho para visualizar o
            PDF.
          </li>
          <li>
            Tags descrevem perfis (ex.: treinador, júnior, sábado) e ajudam nos
            filtros/heurística.
          </li>
          <li>
            Locais preferidos/proibidos guiam o revezamento; um local não pode
            estar nas duas listas.
          </li>
          <li>
            ID da agenda Google é o calendarId usado para publicar eventos e ler
            conflitos.
          </li>
        </ul>
      </Modal>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setEditing(null);
        }}
        title={editing ? 'Editar profissional' : 'Cadastrar profissional'}
        description='Nome, email, turno preferencial e limites de carga.'
      >
        <form className='account-form' onSubmit={handleSubmit}>
          <div className='two-cols'>
            <label className='field'>
              <span>Nome</span>
              <input
                required
                value={form.nome}
                onChange={(event) =>
                  setForm({ ...form, nome: event.target.value })
                }
                placeholder='Nome completo'
              />
            </label>
            <label className='field'>
              <span>Email</span>
              <input
                required
                type='email'
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder='pessoa@exemplo.com'
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Turno preferencial</span>
              <select
                value={form.turno_preferencial}
                onChange={(event) =>
                  setForm({ ...form, turno_preferencial: event.target.value })
                }
              >
                <option value=''>Sem preferência</option>
                <option value='manha'>Manhã</option>
                <option value='tarde'>Tarde</option>
              </select>
            </label>
            <label className='field'>
              <span>Classificação</span>
              <select
                value={form.classificacao}
                onChange={(event) =>
                  setForm({ ...form, classificacao: event.target.value })
                }
              >
                {classificacoes.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className='two-cols'>
            <label className='field'>
              <span>Carga semanal alvo (h)</span>
              <input
                type='number'
                min='0'
                max='80'
                value={form.carga_semanal_alvo}
                onChange={(event) =>
                  setForm({
                    ...form,
                    carga_semanal_alvo: Number(event.target.value),
                  })
                }
              />
            </label>
            <label className='field'>
              <span>Limite dobras/semana</span>
              <input
                type='number'
                min='0'
                max='10'
                value={form.limite_dobras_semana}
                onChange={(event) =>
                  setForm({
                    ...form,
                    limite_dobras_semana: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <hr className='divider' />

          <div className='two-cols'>
            <label className='field'>
              <span>Valor diária (R$)</span>
              <input
                type='number'
                step='0.01'
                disabled={diariaDisabled}
                value={form.valor_diaria}
                onChange={(event) =>
                  setForm({ ...form, valor_diaria: event.target.value })
                }
                placeholder='Para MEI/Freelancer'
              />
            </label>
            <label className='field'>
              <span>Comissão sábado (%)</span>
              <input
                type='number'
                step='0.01'
                value={form.comissao_sabado}
                onChange={(event) =>
                  setForm({ ...form, comissao_sabado: event.target.value })
                }
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Salário mensal (R$)</span>
              <input
                type='number'
                step='0.01'
                disabled={salarioDisabled}
                value={form.valor_salario_mensal}
                onChange={(event) =>
                  setForm({
                    ...form,
                    valor_salario_mensal: event.target.value,
                  })
                }
                placeholder='Para Estagiária'
              />
            </label>
            <label className='field'>
              <span>Vale transporte (R$)</span>
              <input
                type='number'
                step='0.01'
                disabled={salarioDisabled}
                value={form.valor_vale_transporte}
                onChange={(event) =>
                  setForm({
                    ...form,
                    valor_vale_transporte: event.target.value,
                  })
                }
              />
            </label>
          </div>

          <hr className='divider' />

          <div className='two-cols'>
            <label className='field'>
              <span>CPF</span>
              <input
                value={form.cpf}
                onChange={(event) =>
                  setForm({ ...form, cpf: event.target.value })
                }
                placeholder='000.000.000-00'
              />
            </label>
            <label className='field'>
              <span>Celular</span>
              <input
                value={form.celular}
                onChange={(event) =>
                  setForm({ ...form, celular: event.target.value })
                }
                placeholder='+5531999999999'
              />
            </label>
          </div>

          <div className='two-cols'>
            <label className='field'>
              <span>Data Contrato</span>
              <input
                type='date'
                value={form.data_contrato}
                onChange={(event) =>
                  setForm({ ...form, data_contrato: event.target.value })
                }
              />
            </label>
            <label className='field'>
              <span>Link Contrato (URL)</span>
              <input
                type='url'
                value={form.link_contrato}
                onChange={(event) =>
                  setForm({ ...form, link_contrato: event.target.value })
                }
              />
            </label>
          </div>
          {contratoLink ? (
            <p className='muted small-print'>
              <a href={contratoLink} target='_blank' rel='noreferrer'>
                Abrir contrato em nova aba
              </a>
            </p>
          ) : null}

          {!isEstagiaria ? (
            <>
              <div className='two-cols'>
                <label className='field'>
                  <span>CNPJ</span>
                  <input
                    value={form.cnpj}
                    onChange={(event) =>
                      setForm({ ...form, cnpj: event.target.value })
                    }
                  />
                </label>
                <label className='field'>
                  <span>Nome Empresarial</span>
                  <input
                    value={form.nome_empresarial}
                    onChange={(event) =>
                      setForm({ ...form, nome_empresarial: event.target.value })
                    }
                  />
                </label>
              </div>
              <div className='two-cols'>
                <label className='field'>
                  <span>Inscrição Municipal</span>
                  <input
                    value={form.inscricao_municipal}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        inscricao_municipal: event.target.value,
                      })
                    }
                  />
                </label>
                <label className='field'>
                  <span>Endereço Empresa</span>
                  <input
                    value={form.endereco_empresa}
                    onChange={(event) =>
                      setForm({ ...form, endereco_empresa: event.target.value })
                    }
                  />
                </label>
              </div>
            </>
          ) : null}

          <div className='three-cols'>
            <label className='field'>
              <span>Banco</span>
              <input
                value={form.banco_nome}
                onChange={(e) =>
                  setForm({ ...form, banco_nome: e.target.value })
                }
              />
            </label>
            <label className='field'>
              <span>Agência</span>
              <input
                value={form.banco_agencia}
                onChange={(e) =>
                  setForm({ ...form, banco_agencia: e.target.value })
                }
              />
            </label>
            <label className='field'>
              <span>Conta</span>
              <input
                value={form.banco_conta}
                onChange={(e) =>
                  setForm({ ...form, banco_conta: e.target.value })
                }
              />
            </label>
          </div>

          <hr className='divider' />

          <label className='field'>
            <span>Tags (separadas por vírgula)</span>
            <input
              placeholder='Ex.: treinador, manha, sabado'
              value={form.tags}
              onChange={(event) =>
                setForm({ ...form, tags: event.target.value })
              }
            />
          </label>

          <label className='field'>
            <span>Google Calendar ID</span>
            <input
              placeholder='email@group.calendar.google.com'
              value={form.google_calendar_id}
              onChange={(event) =>
                setForm({ ...form, google_calendar_id: event.target.value })
              }
            />
            <small className='muted'>
              Usado para verificação de conflitos de agenda.
            </small>
          </label>

          <div className='two-cols'>
            <label className='field'>
              <span>Locais Preferidos (Segure Ctrl/Cmd)</span>
              <select
                multiple
                value={form.locais_preferidos.map(String)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    locais_preferidos: handleMultiSelect(e.target.options),
                  })
                }
                style={{ height: '8rem' }}
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className='field'>
              <span>Locais Proibidos (Segure Ctrl/Cmd)</span>
              <select
                multiple
                value={form.locais_proibidos.map(String)}
                onChange={(e) =>
                  setForm({
                    ...form,
                    locais_proibidos: handleMultiSelect(e.target.options),
                  })
                }
                style={{ height: '8rem' }}
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className='form-actions'>
            <button
              type='button'
              className='ghost-button'
              onClick={() => {
                setShowModal(false);
                setEditing(null);
              }}
            >
              Cancelar
            </button>
            <button type='submit' className='primary-button'>
              {editing ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
