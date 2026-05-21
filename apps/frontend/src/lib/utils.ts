import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string, fmt = 'dd/MM/yyyy HH:mm'): string {
  try {
    return format(parseISO(iso), fmt, { locale: ptBR });
  } catch {
    return iso;
  }
}
