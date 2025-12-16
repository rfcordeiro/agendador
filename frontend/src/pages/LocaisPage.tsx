import { useCallback, useEffect, useMemo, useState, FormEvent } from 'react';
import {
  Local,
  Sala,
  CapacidadeSala,
  CapacityGridRow,
  LocalTipo,
} from '../types';
import {
  fetchLocais,
  fetchSalas,
  fetchCapacidades,
  createLocal,
  updateLocal,
  createSala,
  updateSala,
  deleteSala,
  deleteLocal,
  createCapacidadeSala,
  updateCapacidadeSala,
  deleteCapacidadeSala,
} from '../lib/api';
import { Modal } from '../components/ui/Modal';
import { getSalaLabel } from './../utils/format'; // Vou criar esse utilitário em breve, ou extrair a função

// Utility functions that were in App.tsx
// TODO: Move these to a shared utils file
function normalizeTimeInput(value: string): string {
  if (!value) return '';
  const [hour = '00', minute = '00'] = value.split(':');
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0').slice(0, 2)}`;
}

function describeTurnos(local: Local): string {
  const manha = `${normalizeTimeInput(local.manha_inicio)}-${normalizeTimeInput(local.manha_fim)}`;
  const tarde = `${normalizeTimeInput(local.tarde_inicio)}-${normalizeTimeInput(local.tarde_fim)}`;
  const sabado = `${normalizeTimeInput(local.sabado_inicio)}-${normalizeTimeInput(local.sabado_fim)}`;
  return `Manhã ${manha} · Tarde ${tarde} · Sáb ${sabado}`;
}

const localTipoLabel: Record<LocalTipo, string> = {
  clinica: 'Clínica',
  associacao: 'Associação',
  evento: 'Evento',
};

const localTipoOptions: { value: LocalTipo; label: string; hint: string }[] = [
  { value: 'clinica', label: 'Clínica', hint: 'Aberta para agenda padrão.' },
  {
    value: 'associacao',
    label: 'Associação',
    hint: 'Fluxo restrito ou interno.',
  },
  {
    value: 'evento',
    label: 'Evento',
    hint: 'Datas pontuais; agenda futura manual.',
  },
];

const diasSemana = [
  { label: 'Seg', value: 0 },
  { label: 'Ter', value: 1 },
  { label: 'Qua', value: 2 },
  { label: 'Qui', value: 3 },
  { label: 'Sex', value: 4 },
  { label: 'Sáb', value: 5 },
  { label: 'Dom', value: 6 },
];

interface LocalForm {
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
}

const defaultTurnos: Pick<
  LocalForm,
  | 'manha_inicio'
  | 'manha_fim'
  | 'tarde_inicio'
  | 'tarde_fim'
  | 'sabado_inicio'
  | 'sabado_fim'
> = {
  manha_inicio: '08:00',
  manha_fim: '14:00',
  tarde_inicio: '14:00',
  tarde_fim: '20:00',
  sabado_inicio: '09:00',
  sabado_fim: '14:00',
};

export function LocaisPage() {
  const [locais, setLocais] = useState<Local[]>([]);
  const [salas, setSalas] = useState<Sala[]>([]);
  const [capacidades, setCapacidades] = useState<CapacidadeSala[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [localForm, setLocalForm] = useState<LocalForm>({
    nome: '',
    area: '',
    endereco: '',
    observacao: '',
    prioridade_cobertura: 1,
    tipo: 'evento',
    ...defaultTurnos,
  });
  const [salaForm, setSalaForm] = useState({ local: 0, nome: '' });
  const [capTargetSala, setCapTargetSala] = useState<Sala | null>(null);
  const [expandedLocais, setExpandedLocais] = useState<Set<number>>(new Set());
  const [showLocalModal, setShowLocalModal] = useState(false);
  const [showSalaModal, setShowSalaModal] = useState(false);
  const [showCapModal, setShowCapModal] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingLocal, setEditingLocal] = useState<Local | null>(null);
  const [editingSala, setEditingSala] = useState<Sala | null>(null);
  const [capacityGrid, setCapacityGrid] = useState<CapacityGridRow[]>(
    diasSemana.map((dia) => ({ dia_semana: dia.value, manha: '', tarde: '' })),
  );

  const loadData = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [locaisData, salasData, capacidadesData] = await Promise.all([
        fetchLocais(),
        fetchSalas(),
        fetchCapacidades(),
      ]);
      setLocais(locaisData);
      setSalas(salasData);
      setCapacidades(capacidadesData);
      setExpandedLocais(new Set(locaisData.map((item) => item.id)));
      if (locaisData.length) {
        setSalaForm((prev) => ({
          ...prev,
          local: prev.local || locaisData[0].id,
        }));
      }
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao carregar locais.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const capacidadesSemanais = useMemo(() => capacidades, [capacidades]);

  const handleLocalSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      if (editingLocal) {
        const updated = await updateLocal(editingLocal.id, localForm);
        setLocais((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setSuccess('Local atualizado.');
        setEditingLocal(null);
      } else {
        const created = await createLocal(localForm);
        setLocais((prev) => [...prev, created]);
        setExpandedLocais((prev) => {
          const next = new Set(prev);
          next.add(created.id);
          return next;
        });
        setSuccess('Local cadastrado.');
      }
      setLocalForm({
        nome: '',
        area: '',
        endereco: '',
        observacao: '',
        prioridade_cobertura: 1,
        tipo: 'evento',
        ...defaultTurnos,
      });
      setShowLocalModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao cadastrar local.';
      setError(message);
    }
  };

  const handleSalaSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!salaForm.local && locais.length) {
      setSalaForm((prev) => ({ ...prev, local: locais[0].id }));
    }
    setError(null);
    setSuccess(null);
    try {
      if (editingSala) {
        const updated = await updateSala(editingSala.id, salaForm);
        setSalas((prev) =>
          prev.map((item) => (item.id === updated.id ? updated : item)),
        );
        setEditingSala(null);
        setSuccess('Sala atualizada.');
      } else {
        const created = await createSala(salaForm);
        setSalas((prev) => [...prev, created]);
        const defaultCaps = diasSemana
          .filter((dia) => dia.value <= 4)
          .flatMap((dia) => [
            createCapacidadeSala({
              sala: created.id,
              dia_semana: dia.value,
              turno: 'manha',
              capacidade: 1,
            }),
            createCapacidadeSala({
              sala: created.id,
              dia_semana: dia.value,
              turno: 'tarde',
              capacidade: 1,
            }),
          ]);
        await Promise.all(defaultCaps);
        const capacidadesAtualizadas = await fetchCapacidades();
        setCapacidades(capacidadesAtualizadas);
        setSuccess('Sala adicionada com capacidade padrão Seg-Sex.');
      }
      setSalaForm((prev) => ({ ...prev, nome: '' }));
      setShowSalaModal(false);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao cadastrar sala.';
      setError(message);
    }
  };

  const salasPorLocal = useMemo(() => {
    const mapping: Record<number, Sala[]> = {};
    salas.forEach((sala) => {
      mapping[sala.local] = mapping[sala.local]
        ? [...mapping[sala.local], sala]
        : [sala];
    });
    return mapping;
  }, [salas]);

  const locaisById = useMemo(() => {
    const mapping: Record<number, Local> = {};
    locais.forEach((local) => {
      mapping[local.id] = local;
    });
    return mapping;
  }, [locais]);

  const selectedSala = capTargetSala;
  const selectedLocal = useMemo(
    () => (selectedSala ? locaisById[selectedSala.local] : null),
    [locaisById, selectedSala],
  );

  const capacidadesByKey = useMemo(() => {
    const map: Record<string, CapacidadeSala> = {};
    capacidadesSemanais
      .filter((item) => item.sala === (capTargetSala?.id ?? 0))
      .forEach((item) => {
        const key = `${item.dia_semana}-${item.turno}`;
        map[key] = item;
      });
    return map;
  }, [capTargetSala?.id, capacidadesSemanais]);

  const handleCapSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!capTargetSala) {
      setError('Selecione uma sala para registrar capacidade.');
      return;
    }
    setError(null);
    setSuccess(null);
    try {
      const operations: Promise<unknown>[] = [];
      capacityGrid.forEach((row) => {
        (['manha', 'tarde'] as const).forEach((turno) => {
          const raw = turno === 'manha' ? row.manha : row.tarde;
          const value = Number.parseInt(raw, 10);
          const key = `${row.dia_semana}-${turno}`;
          const existing = capacidadesByKey[key];

          if (Number.isFinite(value) && value > 0) {
            if (existing) {
              operations.push(
                updateCapacidadeSala(existing.id, {
                  ...existing,
                  capacidade: value,
                }),
              );
            } else {
              operations.push(
                createCapacidadeSala({
                  sala: capTargetSala.id,
                  dia_semana: row.dia_semana,
                  turno,
                  capacidade: value,
                }),
              );
            }
          } else if (existing) {
            operations.push(deleteCapacidadeSala(existing.id));
          }
        });
      });

      await Promise.all(operations);
      const capacidadesAtualizadas = await fetchCapacidades();
      setCapacidades(capacidadesAtualizadas);
      setSuccess('Capacidade registrada para a sala selecionada.');
      setShowCapModal(false);
      setCapacityGrid(
        diasSemana.map((dia) => ({
          dia_semana: dia.value,
          manha: '',
          tarde: '',
        })),
      );
      setCapTargetSala(null);
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar capacidade.';
      setError(message);
    }
  };

  const capacidadeSemana = useMemo(
    () =>
      capacityGrid.reduce((total, row) => {
        const manha = Number.parseInt(row.manha, 10);
        const tarde = Number.parseInt(row.tarde, 10);
        const valores = [manha, tarde].filter(
          (value) => Number.isFinite(value) && value > 0,
        );
        return total + valores.reduce((acc, value) => acc + value, 0);
      }, 0),
    [capacityGrid],
  );
  const capacidadeSalvaSemana = useMemo(
    () =>
      capacidadesSemanais
        .filter((item) => item.sala === (capTargetSala?.id ?? 0))
        .reduce((total, item) => total + (item.capacidade || 0), 0),
    [capTargetSala?.id, capacidadesSemanais],
  );

  const fillDefaultCapacity = () => {
    setCapacityGrid(
      diasSemana.map((dia) => ({
        dia_semana: dia.value,
        manha: dia.value <= 4 ? '1' : '',
        tarde: dia.value <= 4 ? '1' : '',
      })),
    );
  };

  const clearCapacityGrid = () => {
    setCapacityGrid(
      diasSemana.map((dia) => ({
        dia_semana: dia.value,
        manha: '',
        tarde: '',
      })),
    );
  };

  const resumoGlobal = useMemo(() => {
    const totalPorDia = diasSemana.map((dia) => {
      const capsDia = capacidadesSemanais.filter(
        (cap) => cap.dia_semana === dia.value,
      );
      const manha = capsDia
        .filter((cap) => cap.turno === 'manha')
        .reduce((total, cap) => total + (cap.capacidade || 0), 0);
      const tarde = capsDia
        .filter((cap) => cap.turno === 'tarde')
        .reduce((total, cap) => total + (cap.capacidade || 0), 0);
      return { dia: dia.value, manha, tarde };
    });
    const totalSemanal = totalPorDia.reduce(
      (acc, value) => acc + value.manha + value.tarde,
      0,
    );
    return { totalPorDia, totalSemanal };
  }, [capacidadesSemanais]);

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Locais e salas</h2>
          <p className='lede'>
            Tabela de locais. Cadastre locais, salas e capacidades via modais.
          </p>
        </div>
        <div className='panel-actions'>
          <button
            className='primary-button'
            type='button'
            onClick={() => {
              setEditingLocal(null);
              setLocalForm({
                nome: '',
                area: '',
                endereco: '',
                observacao: '',
                prioridade_cobertura: 1,
                tipo: 'evento',
                ...defaultTurnos,
              });
              setShowLocalModal(true);
            }}
          >
            + Local
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
      <div className='global-summary'>
        <p className='muted small-print'>Resumo geral (todos os locais)</p>
        <div className='global-summary-row'>
          <div className='dia-summary'>
            {diasSemana.map((dia, index) => (
              <span
                key={`global-${dia.value}`}
                className='day-chip day-chip--global'
                data-day={dia.value}
              >
                <span
                  className='day-icon day-icon--large'
                  data-day={dia.value}
                />
                <span className='day-label'>{dia.label}</span>
                <span
                  className={`day-badge${
                    resumoGlobal.totalPorDia[index].manha === 0 &&
                    resumoGlobal.totalPorDia[index].tarde === 0
                      ? ' badge-empty'
                      : ''
                  }`}
                >
                  {resumoGlobal.totalPorDia[index].manha}/
                  {resumoGlobal.totalPorDia[index].tarde}
                </span>
              </span>
            ))}
          </div>
          <span className='metric-pill metric-pill--right'>
            <span className='pill-title'>Turnos/semana</span>
            <span className='day-badge'>{resumoGlobal.totalSemanal}</span>
          </span>
        </div>
      </div>
      {loading ? (
        <p className='muted'>Carregando locais...</p>
      ) : (
        <div className='local-list'>
          {locais.map((local) => {
            const salasDoLocal = salasPorLocal[local.id] || [];
            const totalLocal = capacidadesSemanais
              .filter((cap) =>
                salasDoLocal.some((sala) => sala.id === cap.sala),
              )
              .reduce((total, cap) => total + (cap.capacidade || 0), 0);
            return (
              <article key={local.id} className='local-card'>
                <div className='local-head'>
                  <div>
                    <p className='eyebrow'>Local</p>
                    <h3>{local.nome}</h3>
                    <p className='muted small-print'>
                      {local.area || 'Área não informada'} · Prioridade{' '}
                      {local.prioridade_cobertura}
                    </p>
                    <p className='muted small-print'>
                      {localTipoLabel[local.tipo]} · {describeTurnos(local)}
                    </p>
                    <p className='muted small-print'>
                      {local.endereco || 'Endereço não informado'}
                    </p>
                    {local.observacao ? (
                      <p className='muted small-print'>
                        Obs.: {local.observacao}
                      </p>
                    ) : null}
                  </div>
                  <div className='local-total'>
                    <div className='metric-pill'>
                      <span className='pill-title'>Salas</span>
                      <span className='day-badge'>{salasDoLocal.length}</span>
                    </div>
                    <div className='metric-pill'>
                      <span className='pill-title'>Turnos/semana</span>
                      <span className='day-badge'>{totalLocal}</span>
                    </div>
                  </div>
                  <div className='local-actions'>
                    <button
                      className='ghost-button small soft'
                      type='button'
                      onClick={() => {
                        setEditingLocal(local);
                        setLocalForm({
                          nome: local.nome,
                          area: local.area,
                          endereco: local.endereco,
                          observacao: local.observacao,
                          prioridade_cobertura: local.prioridade_cobertura,
                          tipo: local.tipo,
                          manha_inicio: normalizeTimeInput(local.manha_inicio),
                          manha_fim: normalizeTimeInput(local.manha_fim),
                          tarde_inicio: normalizeTimeInput(local.tarde_inicio),
                          tarde_fim: normalizeTimeInput(local.tarde_fim),
                          sabado_inicio: normalizeTimeInput(
                            local.sabado_inicio,
                          ),
                          sabado_fim: normalizeTimeInput(local.sabado_fim),
                        });
                        setShowLocalModal(true);
                      }}
                    >
                      ✏️ Editar local
                    </button>
                    <button
                      className='ghost-button small danger filled'
                      type='button'
                      onClick={async () => {
                        if (
                          window.confirm(
                            `Remover o local ${local.nome}? As salas vinculadas também serão removidas.`,
                          )
                        ) {
                          try {
                            const salasDoLocalToRemove = salas.filter(
                              (sala) => sala.local === local.id,
                            );
                            await deleteLocal(local.id);
                            setLocais((prev) =>
                              prev.filter((item) => item.id !== local.id),
                            );
                            setSalas((prev) =>
                              prev.filter((sala) => sala.local !== local.id),
                            );
                            setCapacidades((prev) =>
                              prev.filter(
                                (cap) =>
                                  !salasDoLocalToRemove.some(
                                    (sala) => sala.id === cap.sala,
                                  ),
                              ),
                            );
                            setSuccess('Local removido.');
                          } catch (exception) {
                            const message =
                              exception instanceof Error
                                ? exception.message
                                : 'Erro ao remover local.';
                            setError(message);
                          }
                        }
                      }}
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className='local-body'>
                  <div className='sala-list'>
                    <div className='sala-list__header'>
                      <div className='dia-summary local-summary'>
                        {diasSemana.map((dia) => {
                          const totalDiaLocal = capacidadesSemanais
                            .filter(
                              (cap) =>
                                (salasPorLocal[local.id] || []).some(
                                  (sala) => sala.id === cap.sala,
                                ) && cap.dia_semana === dia.value,
                            )
                            .reduce(
                              (total, cap) => total + (cap.capacidade || 0),
                              0,
                            );
                          return (
                            <span
                              key={`local-${local.id}-${dia.value}`}
                              className='day-chip day-chip--local'
                              data-day={dia.value}
                            >
                              <span className='day-dot' data-day={dia.value} />
                              <span className='day-label'>{dia.label}</span>
                              <span
                                className={`day-badge${totalDiaLocal === 0 ? ' badge-empty' : ''}`}
                              >
                                {totalDiaLocal}
                              </span>
                            </span>
                          );
                        })}
                      </div>
                      <div className='sala-list__actions'>
                        <button
                          className='ghost-button small soft'
                          type='button'
                          onClick={() => {
                            const salasDoLocal = salasPorLocal[local.id] || [];
                            const numeros = salasDoLocal
                              .map((sala) =>
                                Number.parseInt(
                                  sala.nome.replace(/\D/g, ''),
                                  10,
                                ),
                              )
                              .filter((n) => Number.isFinite(n));
                            const nextNumber =
                              numeros.length > 0
                                ? Math.max(...numeros) + 1
                                : salasDoLocal.length + 1;
                            setSalaForm({
                              local: local.id,
                              nome: `Sala ${nextNumber}`,
                            });
                            setEditingSala(null);
                            setShowSalaModal(true);
                            setExpandedLocais((prev) =>
                              new Set(prev).add(local.id),
                            );
                          }}
                        >
                          ➕ Adicionar sala
                        </button>
                        {salasDoLocal.length ? (
                          <button
                            className='ghost-button small soft'
                            type='button'
                            onClick={() =>
                              setExpandedLocais((prev) => {
                                const next = new Set(prev);
                                if (next.has(local.id)) {
                                  next.delete(local.id);
                                } else {
                                  next.add(local.id);
                                }
                                return next;
                              })
                            }
                          >
                            {expandedLocais.has(local.id)
                              ? '⬆️ Ocultar salas'
                              : '⬇️ Mostrar salas'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                    {expandedLocais.has(local.id) && salasDoLocal.length
                      ? salasDoLocal.map((sala) => {
                          const resumoDias = diasSemana.map((dia) => {
                            const totalDia = capacidadesSemanais
                              .filter(
                                (cap) =>
                                  cap.sala === sala.id &&
                                  cap.dia_semana === dia.value,
                              )
                              .reduce(
                                (total, cap) => total + (cap.capacidade || 0),
                                0,
                              );
                            return {
                              label: dia.label,
                              total: totalDia,
                              value: dia.value,
                            };
                          });

                          return (
                            <div key={sala.id} className='sala-item'>
                              <div className='sala-main'>
                                <div>
                                  <strong>
                                    {getSalaLabel(sala, locaisById)}
                                  </strong>
                                  <div className='dia-summary'>
                                    {resumoDias.map((dia) => (
                                      <span
                                        key={`${sala.id}-${dia.value}`}
                                        className={`day-chip day-chip--sala${
                                          dia.total === 0
                                            ? ' day-chip--empty'
                                            : ''
                                        }`}
                                        data-day={dia.value}
                                      >
                                        <span className='day-label'>
                                          {dia.label}
                                        </span>
                                        <span
                                          className={`day-badge${dia.total === 0 ? ' badge-empty' : ''}`}
                                        >
                                          {dia.total}
                                        </span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                <div className='sala-actions'>
                                  <button
                                    className='ghost-button small soft'
                                    type='button'
                                    onClick={() => {
                                      setEditingSala(sala);
                                      setSalaForm({
                                        local: sala.local,
                                        nome: sala.nome,
                                      });
                                      setShowSalaModal(true);
                                    }}
                                  >
                                    ✏️ Editar
                                  </button>
                                  <button
                                    className='ghost-button small soft'
                                    type='button'
                                    onClick={async () => {
                                      if (
                                        window.confirm(
                                          `Remover a sala ${getSalaLabel(sala, locaisById)}?`,
                                        )
                                      ) {
                                        try {
                                          await deleteSala(sala.id);
                                          setSalas((prev) =>
                                            prev.filter(
                                              (item) => item.id !== sala.id,
                                            ),
                                          );
                                          setCapacidades((prev) =>
                                            prev.filter(
                                              (cap) => cap.sala !== sala.id,
                                            ),
                                          );
                                          setSuccess('Sala removida.');
                                        } catch (exception) {
                                          const message =
                                            exception instanceof Error
                                              ? exception.message
                                              : 'Erro ao remover sala.';
                                          setError(message);
                                        }
                                      }
                                    }}
                                  >
                                    🗑️ Remover
                                  </button>
                                  <button
                                    className='ghost-button small primary-ghost'
                                    type='button'
                                    onClick={() => {
                                      setCapTargetSala(sala);
                                      setShowCapModal(true);
                                      setCapacityGrid(
                                        diasSemana.map((dia) => {
                                          const manhaExistente =
                                            capacidadesSemanais.find(
                                              (cap) =>
                                                cap.sala === sala.id &&
                                                cap.dia_semana === dia.value &&
                                                cap.turno === 'manha',
                                            );
                                          const tardeExistente =
                                            capacidadesSemanais.find(
                                              (cap) =>
                                                cap.sala === sala.id &&
                                                cap.dia_semana === dia.value &&
                                                cap.turno === 'tarde',
                                            );
                                          return {
                                            dia_semana: dia.value,
                                            manha: manhaExistente
                                              ? String(
                                                  manhaExistente.capacidade ??
                                                    '',
                                                )
                                              : '',
                                            tarde: tardeExistente
                                              ? String(
                                                  tardeExistente.capacidade ??
                                                    '',
                                                )
                                              : '',
                                          };
                                        }),
                                      );
                                    }}
                                  >
                                    📊 Semana
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      : null}
                  </div>
                </div>
              </article>
            );
          })}
          {!locais.length ? (
            <p className='muted'>Nenhum local cadastrado.</p>
          ) : null}
        </div>
      )}

      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como cadastrar locais e salas'
        description='Passos para montar a infraestrutura de escala.'
      >
        <ul className='help-list'>
          <li>
            Local é a clínica/unidade (ex.: Savassi, Lourdes). Informe
            área/região e prioridade.
          </li>
          <li>
            Tipo do local (clínica/associação/evento) e horários de turno
            definem como a agenda vai abrir no futuro.
          </li>
          <li>
            Sala é um espaço físico dentro do local; cada sala recebe uma
            profissional por turno.
          </li>
          <li>
            Capacidade por dia/turno define quando a sala opera (geralmente 1).
            Marque disponibilidade.
          </li>
          <li>
            Recorrências aqui são apenas semanais; exceções pontuais entram nas
            agendas.
          </li>
          <li>
            Esses cadastros alimentam a geração de escala e a detecção de gaps
            por local/turno.
          </li>
        </ul>
      </Modal>

      <Modal
        open={showLocalModal}
        onClose={() => {
          setShowLocalModal(false);
          setEditingLocal(null);
        }}
        title={editingLocal ? 'Editar local' : 'Cadastrar local'}
        description='Inclua nome, área/região, prioridade de cobertura e observações.'
      >
        <form className='account-form' onSubmit={handleLocalSubmit}>
          <label className='field'>
            <span>Nome</span>
            <input
              required
              value={localForm.nome}
              onChange={(event) =>
                setLocalForm({ ...localForm, nome: event.target.value })
              }
              placeholder='Savassi, Lourdes...'
            />
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Área/Região</span>
              <input
                value={localForm.area}
                onChange={(event) =>
                  setLocalForm({ ...localForm, area: event.target.value })
                }
              />
            </label>
            <label className='field'>
              <span>Prioridade de cobertura</span>
              <input
                type='number'
                min={1}
                value={localForm.prioridade_cobertura}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    prioridade_cobertura: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <label className='field'>
            <span>Tipo do local</span>
            <select
              value={localForm.tipo}
              onChange={(event) =>
                setLocalForm({
                  ...localForm,
                  tipo: event.target.value as LocalTipo,
                })
              }
            >
              {localTipoOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className='muted small-print'>
              {
                localTipoOptions.find(
                  (option) => option.value === localForm.tipo,
                )?.hint
              }
            </p>
          </label>
          <div className='two-cols'>
            <label className='field'>
              <span>Manhã - início</span>
              <input
                type='time'
                value={localForm.manha_inicio}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    manha_inicio: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
            <label className='field'>
              <span>Manhã - fim</span>
              <input
                type='time'
                value={localForm.manha_fim}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    manha_fim: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Tarde - início</span>
              <input
                type='time'
                value={localForm.tarde_inicio}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    tarde_inicio: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
            <label className='field'>
              <span>Tarde - fim</span>
              <input
                type='time'
                value={localForm.tarde_fim}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    tarde_fim: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className='two-cols'>
            <label className='field'>
              <span>Sábado - início</span>
              <input
                type='time'
                value={localForm.sabado_inicio}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    sabado_inicio: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
            <label className='field'>
              <span>Sábado - fim</span>
              <input
                type='time'
                value={localForm.sabado_fim}
                onChange={(event) =>
                  setLocalForm({
                    ...localForm,
                    sabado_fim: normalizeTimeInput(event.target.value),
                  })
                }
              />
            </label>
          </div>
          <p className='muted small-print'>
            Padrão: manhã 08:00-14:00 e tarde 14:00-20:00; sábado 09:00-14:00.
            Ajuste se a unidade tiver janelas diferentes.
          </p>
          <label className='field'>
            <span>Endereço</span>
            <input
              value={localForm.endereco}
              onChange={(event) =>
                setLocalForm({ ...localForm, endereco: event.target.value })
              }
            />
          </label>
          <label className='field'>
            <span>Observação</span>
            <textarea
              rows={3}
              value={localForm.observacao}
              onChange={(event) =>
                setLocalForm({ ...localForm, observacao: event.target.value })
              }
              placeholder='Notas internas ou restrições específicas deste local.'
            />
          </label>
          <div className='account-actions'>
            <button className='primary-button' type='submit'>
              Salvar local
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => setShowLocalModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showSalaModal}
        onClose={() => {
          setShowSalaModal(false);
          setEditingSala(null);
        }}
        title={editingSala ? 'Editar sala' : 'Cadastrar sala'}
        description='Salas novas recebem capacidade padrão (Seg-Sex, manhã e tarde).'
      >
        <form className='account-form' onSubmit={handleSalaSubmit}>
          <div className='two-cols'>
            <label className='field'>
              <span>Local</span>
              <select
                value={salaForm.local}
                onChange={(event) =>
                  setSalaForm({
                    ...salaForm,
                    local: Number(event.target.value),
                  })
                }
              >
                {locais.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.nome}
                  </option>
                ))}
              </select>
            </label>
            <label className='field'>
              <span>Nome da sala</span>
              <input
                required
                value={salaForm.nome}
                onChange={(event) =>
                  setSalaForm({ ...salaForm, nome: event.target.value })
                }
                placeholder='Sala 1'
              />
            </label>
          </div>
          <div className='account-actions'>
            <button className='primary-button' type='submit'>
              {editingSala ? 'Salvar sala' : 'Adicionar sala'}
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => {
                setShowSalaModal(false);
                setEditingSala(null);
              }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={showCapModal}
        onClose={() => {
          setShowCapModal(false);
          setCapTargetSala(null);
        }}
        title='Capacidade por dia/turno'
        description='Marque a disponibilidade da sala em cada turno.'
      >
        <form className='account-form' onSubmit={handleCapSubmit}>
          <div className='capacity-headline'>
            <div className='capacity-summary'>
              <p className='muted small-print'>Sala selecionada</p>
              <strong>
                {selectedSala
                  ? getSalaLabel(selectedSala, locaisById)
                  : 'Nenhuma sala'}
              </strong>
              <span className='muted'>
                {selectedLocal
                  ? `${selectedLocal.nome} · ${selectedLocal.area || 'Sem área definida'}`
                  : 'Escolha uma sala para ver o local'}
              </span>
            </div>
            {selectedSala ? (
              <div className='capacity-stats-card'>
                <p className='muted small-print'>Resumo rápido</p>
                <div className='capacity-stats'>
                  <span
                    className={`pill-soft${
                      capacidadeSemana !== capacidadeSalvaSemana
                        ? ' pill-warn'
                        : ''
                    }`}
                  >
                    Preenchido: {capacidadeSemana} turnos
                  </span>
                  <span className='pill-soft'>
                    Salvo: {capacidadeSalvaSemana} turnos
                  </span>
                </div>
              </div>
            ) : (
              <div className='capacity-stats-card muted'>
                Nenhuma sala selecionada.
              </div>
            )}
          </div>
          {selectedSala && capacidadeSemana !== capacidadeSalvaSemana ? (
            <div className='capacity-warning inline'>
              ⚠️ Preenchido diferente do salvo — registre para aplicar.
            </div>
          ) : null}
          {!selectedSala ? (
            <div className='alert'>
              Selecione uma sala a partir da lista de locais.
            </div>
          ) : null}
          <div className='capacity-wrapper'>
            <div className='capacity-legend'>
              <div className='capacity-copy'>
                <span className='muted small-print'>
                  Preencha quantas profissionais cabem por turno. Deixe em
                  branco para ignorar.
                </span>
                <span className='muted small-print'>
                  Dica: use o atalho padrão ou limpe antes de salvar novos
                  valores.
                </span>
              </div>
              <div className='capacity-quick'>
                <button
                  className='ghost-button small soft'
                  type='button'
                  onClick={fillDefaultCapacity}
                  disabled={!selectedSala}
                >
                  🔄 Seg-Sex 1/turno
                </button>
                <button
                  className='ghost-button small'
                  type='button'
                  onClick={clearCapacityGrid}
                  disabled={!selectedSala}
                >
                  🧹 Limpar
                </button>
              </div>
            </div>
            <div className='capacity-grid'>
              <div className='capacity-grid__header'>
                <span>Turno</span>
                {diasSemana.map((dia) => (
                  <span key={dia.value}>{dia.label}</span>
                ))}
              </div>
              {['manha', 'tarde'].map((turno) => (
                <div key={turno} className='capacity-grid__row'>
                  <span className='capacity-grid__day'>
                    {turno === 'manha' ? 'Manhã' : 'Tarde'}
                  </span>
                  {diasSemana.map((dia) => {
                    const index = capacityGrid.findIndex(
                      (row) => row.dia_semana === dia.value,
                    );
                    const currentRow = index >= 0 ? capacityGrid[index] : null;
                    const value =
                      turno === 'manha'
                        ? (currentRow?.manha ?? '')
                        : (currentRow?.tarde ?? '');
                    return (
                      <input
                        key={`${turno}-${dia.value}`}
                        type='number'
                        min={0}
                        value={value}
                        onChange={(event) => {
                          const next = event.target.value;
                          setCapacityGrid((prev) =>
                            prev.map((row) =>
                              row.dia_semana === dia.value
                                ? { ...row, [turno]: next }
                                : row,
                            ),
                          );
                        }}
                        placeholder='0'
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          <div className='account-actions'>
            <button
              className='primary-button'
              type='submit'
              disabled={!selectedSala}
            >
              Registrar capacidade
            </button>
            <button
              className='ghost-button'
              type='button'
              onClick={() => setShowCapModal(false)}
            >
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
