import { clsx, type ClassValue } from 'clsx';

/** Une clases condicionales (envoltorio fino sobre clsx). */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
