import React from 'react';

interface LegalTemplateProps {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalTemplate({ title, updatedAt, children }: LegalTemplateProps) {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="mx-auto max-w-4xl bg-white rounded-2xl border border-slate-200 p-8">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-sm text-slate-500 mt-1">Son güncelleme: {updatedAt}</p>
        <div className="prose prose-slate max-w-none mt-6 text-sm leading-7">
          {children}
        </div>
      </div>
    </div>
  );
}
