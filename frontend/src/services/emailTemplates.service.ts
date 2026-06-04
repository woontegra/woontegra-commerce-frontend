import api from './api';
import type {
  CreateEmailTemplateBody,
  EmailTemplateDetail,
  EmailTemplateListItem,
  EmailTemplateMeta,
  UpdateEmailTemplateBody,
} from '../types/emailTemplates.types';

type ListResponse = {
  success: boolean;
  templates?: EmailTemplateListItem[];
  meta?: EmailTemplateMeta;
  error?: string;
};

type DetailResponse = {
  success: boolean;
  template?: EmailTemplateDetail;
  meta?: EmailTemplateMeta;
  error?: string;
};

function encodeKey(key: string): string {
  return encodeURIComponent(key);
}

export async function fetchEmailTemplates(): Promise<{
  templates: EmailTemplateListItem[];
  meta: EmailTemplateMeta;
}> {
  const r = await api.get<ListResponse>('/email-templates', { skipErrorToast: true });
  if (!r.data.success || !r.data.templates) {
    throw new Error(r.data.error || 'E-posta şablonları yüklenemedi.');
  }
  return {
    templates: r.data.templates,
    meta: r.data.meta ?? { keys: [], variables: [] },
  };
}

export async function fetchEmailTemplate(key: string): Promise<{
  template: EmailTemplateDetail;
  meta: EmailTemplateMeta;
}> {
  const r = await api.get<DetailResponse>(`/email-templates/${encodeKey(key)}`, {
    skipErrorToast: true,
  });
  if (!r.data.success || !r.data.template) {
    throw new Error(r.data.error || 'Şablon yüklenemedi.');
  }
  return {
    template: r.data.template,
    meta: r.data.meta ?? { keys: [], variables: [] },
  };
}

export async function createEmailTemplate(
  body: CreateEmailTemplateBody,
): Promise<EmailTemplateDetail> {
  const r = await api.post<DetailResponse>('/email-templates', body, { skipErrorToast: true });
  if (!r.data.success || !r.data.template) {
    throw new Error(r.data.error || 'Şablon oluşturulamadı.');
  }
  return r.data.template;
}

export async function saveEmailTemplate(
  key: string,
  body: UpdateEmailTemplateBody,
): Promise<EmailTemplateDetail> {
  const r = await api.put<DetailResponse>(`/email-templates/${encodeKey(key)}`, body, {
    skipErrorToast: true,
  });
  if (!r.data.success || !r.data.template) {
    throw new Error(r.data.error || 'Şablon kaydedilemedi.');
  }
  return r.data.template;
}

export async function deleteEmailTemplate(key: string): Promise<void> {
  const r = await api.delete<{ success: boolean; error?: string }>(
    `/email-templates/${encodeKey(key)}`,
    { skipErrorToast: true },
  );
  if (!r.data.success) {
    throw new Error(r.data.error || 'Şablon silinemedi.');
  }
}
