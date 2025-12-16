import { useState, useMemo } from 'react';
import { PermissionWidgetProps } from '../../types';

export function PermissionsWidget({
  roles,
  permissions,
  isStaff,
  isSuperuser,
}: PermissionWidgetProps) {
  const [query, setQuery] = useState('');
  const normalizedRoles = roles.length ? roles : ['operador'];
  const normalizedPermissions = useMemo(
    () => Array.from(new Set(permissions)).sort((a, b) => a.localeCompare(b)),
    [permissions],
  );
  const filteredPermissions = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return normalizedPermissions;
    return normalizedPermissions.filter((permission) =>
      permission.toLowerCase().includes(term),
    );
  }, [normalizedPermissions, query]);

  const badges = [
    isSuperuser ? 'Superusuário' : null,
    isStaff && !isSuperuser ? 'Staff' : null,
  ].filter(Boolean) as string[];

  const resultsLabel = `Exibindo ${filteredPermissions.length} de ${normalizedPermissions.length} permissões`;

  return (
    <div
      className='permissions-widget'
      aria-label='Roles e permissões da sessão'
    >
      <div className='permission-header'>
        <div>
          <p className='eyebrow'>Roles e permissões</p>
          <h3>Explorador de acesso</h3>
          <p className='muted'>
            Pesquise e valide o que o usuário pode fazer na interface.
          </p>
        </div>
        <div className='permission-counts'>
          <span className='pill pill-soft'>{normalizedRoles.length} roles</span>
          <span className='pill'>
            {normalizedPermissions.length} permissões
          </span>
        </div>
      </div>

      <div className='permission-meta'>
        <div className='chip-row'>
          {normalizedRoles.map((roleItem) => (
            <span key={roleItem} className='pill pill-soft'>
              {roleItem}
            </span>
          ))}
          {badges.map((badge) => (
            <span key={badge} className='pill'>
              {badge}
            </span>
          ))}
        </div>
        <div className='permission-search'>
          <label className='field-label' htmlFor='permission-search'>
            <span>Pesquisar permissão</span>
            <small className='muted'>{resultsLabel}</small>
          </label>
          <div className='search-input'>
            <span aria-hidden>🔎</span>
            <input
              id='permission-search'
              type='search'
              placeholder='Ex.: schedules.add_schedule'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
      </div>

      {filteredPermissions.length ? (
        <div className='permission-list' role='list'>
          {filteredPermissions.map((permission) => (
            <span key={permission} className='permission-item' role='listitem'>
              {permission}
            </span>
          ))}
        </div>
      ) : (
        <p className='muted permission-empty'>
          {query
            ? 'Nenhuma permissão encontrada para este filtro.'
            : 'Nenhuma permissão informada.'}
        </p>
      )}
    </div>
  );
}
