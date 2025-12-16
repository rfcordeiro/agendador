import { useCallback, useEffect, useState, FormEvent } from 'react';
import { PremissasGlobais } from '../types';
import { fetchPremissas, upsertPremissas } from '../lib/api';
import { Modal } from '../components/ui/Modal';

export function PremissasPage() {
  const [premissas, setPremissas] = useState<PremissasGlobais | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPremissas();
      setPremissas(
        data ?? {
          janela_planejamento_semanas: 4,
          limite_dobras_semana: 2,
          limite_horas_semana: 70,
          politica_revezamento: '',
          confirmacao_diaria: true,
          observacoes: '',
        },
      );
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Falha ao carregar premissas.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!premissas) return;
    setError(null);
    setSuccess(null);
    try {
      const saved = await upsertPremissas(premissas);
      setPremissas(saved);
      setSuccess('Premissas atualizadas.');
    } catch (exception) {
      const message =
        exception instanceof Error
          ? exception.message
          : 'Erro ao salvar premissas.';
      setError(message);
    }
  };

  if (loading) {
    return (
      <section className='panel'>
        <p className='eyebrow'>Premissas globais</p>
        <p className='muted'>Carregando...</p>
      </section>
    );
  }

  if (!premissas) {
    return (
      <section className='panel'>
        <p className='eyebrow'>Premissas globais</p>
        <div className='alert'>Não foi possível carregar premissas.</div>
      </section>
    );
  }

  return (
    <section className='panel'>
      <div className='panel-header'>
        <div>
          <p className='eyebrow'>Cadastros</p>
          <h2>Premissas globais</h2>
          <p className='lede'>Janela de planejamento e revezamento padrão.</p>
        </div>
        <div className='panel-actions'>
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
      <Modal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title='Como preencher premissas'
        description='Parâmetros gerais que guiam a geração.'
      >
        <ul className='help-list'>
          <li>Janela em semanas define o horizonte da escala (default 4).</li>
          <li>
            Limites de horas e dobras por semana protegem contra excesso de
            carga.
          </li>
          <li>
            Política de revezamento documenta as regras de rotação entre locais.
          </li>
          <li>
            Confirmação diária liga a rotina que lê Google Calendar e marca
            conflitos.
          </li>
          <li>
            Use observações para registrar decisões temporárias (ex.: meta de
            60h).
          </li>
        </ul>
      </Modal>
      <form className='account-form' onSubmit={handleSubmit}>
        <div className='two-cols'>
          <label className='field'>
            <span>Janela (semanas)</span>
            <input
              type='number'
              min={1}
              max={12}
              value={premissas.janela_planejamento_semanas}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  janela_planejamento_semanas: Number(event.target.value),
                })
              }
            />
          </label>
          <label className='field'>
            <span>Limite de horas/semana</span>
            <input
              type='number'
              min={1}
              max={84}
              value={premissas.limite_horas_semana}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  limite_horas_semana: Number(event.target.value),
                })
              }
            />
          </label>
        </div>
        <div className='two-cols'>
          <label className='field'>
            <span>Limite de dobras/semana</span>
            <input
              type='number'
              min={0}
              max={14}
              value={premissas.limite_dobras_semana}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  limite_dobras_semana: Number(event.target.value),
                })
              }
            />
          </label>
          <label className='field checkbox-field'>
            <input
              type='checkbox'
              checked={premissas.confirmacao_diaria}
              onChange={(event) =>
                setPremissas({
                  ...premissas,
                  confirmacao_diaria: event.target.checked,
                })
              }
            />
            <span>Confirmação diária ativa</span>
          </label>
        </div>
        <label className='field'>
          <span>Política de revezamento</span>
          <textarea
            rows={3}
            value={premissas.politica_revezamento}
            onChange={(event) =>
              setPremissas({
                ...premissas,
                politica_revezamento: event.target.value,
              })
            }
          />
        </label>
        <label className='field'>
          <span>Observações</span>
          <textarea
            rows={3}
            value={premissas.observacoes}
            onChange={(event) =>
              setPremissas({ ...premissas, observacoes: event.target.value })
            }
          />
        </label>
        <button className='primary-button' type='submit'>
          Salvar premissas
        </button>
      </form>
    </section>
  );
}
