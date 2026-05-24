import { format } from 'date-fns';

export function formatDateTime(value: string) {
  return format(new Date(value), 'dd MMM yyyy, hh:mm a');
}

export function buildDefaultDocumentName(value: string) {
  return `Kaagaz ${format(new Date(value), 'dd MMM yyyy HH-mm')}`;
}
