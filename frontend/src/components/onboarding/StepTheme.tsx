import { ArrowRight, Check, Sparkles } from 'lucide-react';

interface ThemeOption {
  id: string;
  name: string;
  description: string;
  gradient: string;
  previewBg: string;
  previewColor: string;
}

const themes: ThemeOption[] = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Temiz, profesyonel ve yüksek dönüşüm oranlı',
    gradient: 'from-blue-500/20 to-indigo-500/20',
    previewBg: 'bg-white',
    previewColor: 'text-blue-600'
  },
  {
    id: 'classic',
    name: 'Klasik',
    description: 'Geleneksel, güvenilir ve sıcak his',
    gradient: 'from-amber-600/20 to-orange-500/20',
    previewBg: 'bg-amber-50',
    previewColor: 'text-amber-700'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Sade, şık ve odaklanmış',
    gradient: 'from-slate-700/20 to-gray-500/20',
    previewBg: 'bg-slate-100',
    previewColor: 'text-slate-900'
  }
];

interface StepThemeProps {
  selected: string;
  onSelect: (theme: string) => void;
  onNext: () => void;
}

export default function StepTheme({ selected, onSelect, onNext }: StepThemeProps) {
  return (
    <div className="min-h-[calc(100vh-200px)] flex flex-col">
      {/* Header */}
      <div className="text-center mb-12 pt-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 text-violet-600 mb-6">
          <Sparkles className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
          Mağazanızın Görünümünü Seçin
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto">
          Profesyonel bir mağaza oluşturmak için ilk adım. İstediğiniz zaman değiştirebilirsiniz.
        </p>
      </div>

      {/* Theme Grid - Large Preview Cards */}
      <div className="flex-1 max-w-6xl mx-auto w-full px-6">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {themes.map((theme) => (
            <div
              key={theme.id}
              onClick={() => onSelect(theme.id)}
              className={`
                relative group cursor-pointer rounded-2xl overflow-hidden
                transition-all duration-300 ease-out
                ${selected === theme.id
                  ? 'ring-2 ring-violet-500 ring-offset-4 shadow-2xl shadow-violet-500/20 scale-[1.02]'
                  : 'hover:shadow-xl hover:shadow-slate-200/50 hover:scale-[1.01]'
                }
              `}
            >
              {/* Card Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.gradient} opacity-50`} />
              
              {/* Card Content */}
              <div className="relative p-8 bg-white/80 backdrop-blur-sm h-full">
                {/* Selected Badge */}
                {selected === theme.id && (
                  <div className="absolute top-4 right-4 w-8 h-8 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
                    <Check className="w-5 h-5 text-white" />
                  </div>
                )}

                {/* Large Preview Mockup */}
                <div className={`${theme.previewBg} rounded-xl border border-slate-200/60 shadow-sm mb-6 overflow-hidden`}>
                  {/* Browser Bar */}
                  <div className="h-8 bg-slate-100 border-b border-slate-200 flex items-center gap-2 px-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                    <div className="flex-1 h-5 bg-white rounded ml-2" />
                  </div>
                  {/* Mock Content */}
                  <div className="p-6">
                    <div className={`h-4 w-24 rounded mb-4 ${theme.previewColor} bg-current opacity-20`} />
                    <div className="space-y-3">
                      <div className="h-3 w-full rounded bg-slate-200" />
                      <div className="h-3 w-4/5 rounded bg-slate-200" />
                      <div className="h-3 w-3/5 rounded bg-slate-200" />
                    </div>
                    <div className="mt-6 grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-lg bg-slate-100" />
                      <div className="h-20 rounded-lg bg-slate-100" />
                      <div className="h-20 rounded-lg bg-slate-100" />
                    </div>
                  </div>
                </div>

                {/* Theme Info */}
                <h3 className="text-xl font-bold text-slate-900 mb-2">{theme.name}</h3>
                <p className="text-slate-500">{theme.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Action */}
      <div className="flex justify-end max-w-6xl mx-auto w-full px-6 pb-8">
        <button
          onClick={onNext}
          disabled={!selected}
          className={`
            group flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-lg
            transition-all duration-200
            ${selected
              ? 'bg-violet-600 text-white hover:bg-violet-700 hover:shadow-lg hover:shadow-violet-500/25 hover:scale-[1.02]'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }
          `}
        >
          Devam Et
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}
