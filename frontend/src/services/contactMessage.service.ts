import api from './api';
import type { ContactMessage, ContactMessageStatus } from '../types/contactMessage';

export async function fetchContactMessages(
  status?: ContactMessageStatus,
): Promise<ContactMessage[]> {
  const res = await api.get('/contact-messages', {
    params: status ? { status } : undefined,
  });
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
}

export async function fetchContactMessage(id: string): Promise<ContactMessage> {
  const res = await api.get(`/contact-messages/${id}`);
  return res.data?.data ?? res.data;
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus,
): Promise<ContactMessage> {
  const res = await api.patch(`/contact-messages/${id}/status`, { status });
  return res.data?.data ?? res.data;
}
