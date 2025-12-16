import { useState } from 'react';

const passwordRules = [
  'Mínimo de 8 caracteres.',
  'Use pelo menos uma letra maiúscula e uma minúscula.',
  'Inclua número ou símbolo para reforçar a segurança.',
];

export function PasswordRulesHint() {
  const [open, setOpen] = useState(false);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);
  const toggle = () => setOpen((value) => !value);

  return (
    <div className='tooltip' onMouseLeave={hide}>
      <button
        type='button'
        className='info-button'
        aria-label='Ver regras de senha'
        aria-expanded={open}
        aria-controls='password-rules'
        onMouseEnter={show}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
      >
        ?
      </button>
      <div
        id='password-rules'
        role='note'
        className={`tooltip-card${open ? ' visible' : ''}`}
        aria-live='polite'
      >
        <p>Regras recomendadas:</p>
        <ul>
          {passwordRules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
