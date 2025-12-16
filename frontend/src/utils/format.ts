import { Local, Sala } from '../types';

export function getSalaLabel(
  sala: Sala,
  locaisById: Record<number, Local>,
): string {
  const local = locaisById[sala.local];
  return `${local ? `${local.nome} - ` : ''}${sala.nome}`;
}
