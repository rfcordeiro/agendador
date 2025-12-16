import { ModalProps } from '../../types';

export function Modal({
  open,
  title,
  onClose,
  children,
  description,
}: ModalProps) {
  if (!open) return null;
  return (
    <div
      className='modal-backdrop'
      role='dialog'
      aria-modal='true'
      aria-label={title}
    >
      <div className='modal-card'>
        <div className='modal-header'>
          <div>
            <p className='eyebrow'>Cadastro</p>
            <h3>{title}</h3>
            {description ? <p className='muted'>{description}</p> : null}
          </div>
          <button
            className='ghost-button'
            type='button'
            onClick={onClose}
            aria-label='Fechar'
          >
            ✕
          </button>
        </div>
        <div className='modal-body'>{children}</div>
      </div>
    </div>
  );
}
