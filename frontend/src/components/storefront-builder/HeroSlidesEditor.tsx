import { ChevronDown, ChevronUp, Copy, Plus, Trash2 } from 'lucide-react';
import {
  FieldHint,
  SegmentControl,
  SettingCard,
  SliderField,
  ToggleSwitch,
} from './heroBuilderControls';
import {
  HERO_SLIDE_MAX,
  HERO_SLIDE_MIN,
  copyHeroSlide,
  defaultSliderSettings,
  getSlidesForEditor,
  heroSlidesToJson,
  newHeroSlide,
  resolveHeroMode,
  resolveSliderSettings,
  syncSlideToRoot,
  type HeroMode,
  type HeroSlide,
  type HeroSlideTransition,
} from '../../utils/heroSliderHelpers';

type HeroSlidesEditorProps = {
  settings: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
};

function str(settings: Record<string, unknown>, key: string, fallback = ''): string {
  return String(settings[key] ?? fallback);
}

export default function HeroSlidesEditor({ settings, onChange }: HeroSlidesEditorProps) {
  const slides = getSlidesForEditor(settings);
  const activeId = str(settings, 'activeSlideId') || slides[0]?.id || '';
  const slider = resolveSliderSettings(settings);
  const atMax = slides.length >= HERO_SLIDE_MAX;
  const atMin = slides.length <= HERO_SLIDE_MIN;

  const commitSlides = (next: HeroSlide[], nextActiveId?: string) => {
    onChange({
      slides: heroSlidesToJson(next),
      activeSlideId: nextActiveId ?? next.find(s => s.id === activeId)?.id ?? next[0]?.id ?? '',
    });
  };

  const setActive = (id: string) => onChange({ activeSlideId: id });

  const addSlide = () => {
    if (atMax) return;
    const slide = newHeroSlide();
    commitSlides([...slides, slide], slide.id);
  };

  const removeSlide = (id: string) => {
    if (slides.length <= HERO_SLIDE_MIN) return;
    const next = slides.filter(s => s.id !== id);
    const nextActive = activeId === id ? next[0]?.id : activeId;
    commitSlides(next, nextActive);
  };

  const duplicateSlide = (id: string) => {
    if (atMax) return;
    const idx = slides.findIndex(s => s.id === id);
    if (idx < 0) return;
    const copy = copyHeroSlide(slides[idx]);
    const next = [...slides.slice(0, idx + 1), copy, ...slides.slice(idx + 1)];
    commitSlides(next, copy.id);
  };

  const moveSlide = (id: string, dir: -1 | 1) => {
    const idx = slides.findIndex(s => s.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[idx], next[target]] = [next[target], next[idx]];
    commitSlides(next);
  };

  const patchSlider = (patch: Partial<typeof slider>) => {
    onChange({
      sliderSettings: {
        ...defaultSliderSettings(),
        ...slider,
        ...patch,
      },
    });
  };

  const setMode = (mode: HeroMode) => {
    if (mode === resolveHeroMode(settings)) return;
    if (mode === 'slider') {
      const seed = getSlidesForEditor(settings);
      const list = seed.length > 0 ? seed : [newHeroSlide()];
      onChange({
        heroMode: 'slider',
        slides: heroSlidesToJson(list),
        activeSlideId: list[0].id,
        sliderSettings: settings.sliderSettings ?? defaultSliderSettings(),
      });
      return;
    }
    const active = slides.find(s => s.id === activeId) ?? slides[0];
    onChange({
      heroMode: 'single',
      ...(active ? syncSlideToRoot(active) : {}),
    });
  };

  return (
    <div className="space-y-3">
      <SettingCard title="Hero modu" hint="Tek banner veya çoklu slider seçin.">
        <SegmentControl<HeroMode>
          value={resolveHeroMode(settings)}
          options={[
            { id: 'single', label: 'Tek Banner' },
            { id: 'slider', label: 'Slider' },
          ]}
          onChange={setMode}
        />
      </SettingCard>

      {resolveHeroMode(settings) === 'slider' && (
        <>
          <SettingCard title="Slaytlar" hint={`${HERO_SLIDE_MIN}–${HERO_SLIDE_MAX} slide.`}>
            {slides.length === 0 && (
              <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Slider için en az bir slide ekleyin.
              </p>
            )}
            <div className="space-y-2">
              {slides.map((slide, index) => {
                const isActive = slide.id === activeId;
                return (
                  <div
                    key={slide.id}
                    className={`rounded-lg border p-2.5 space-y-2 transition-colors ${
                      isActive ? 'border-indigo-300 bg-indigo-50/40' : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActive(slide.id)}
                        className={`flex-1 min-w-0 text-left text-[11px] font-medium truncate ${
                          isActive ? 'text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        {index + 1}. {slide.title?.trim() || 'Başlıksız slide'}
                        {isActive && <span className="ml-1.5 text-[10px] text-indigo-500">(düzenleniyor)</span>}
                      </button>
                      <div className="flex items-center shrink-0">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => moveSlide(slide.id, -1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Yukarı taşı"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === slides.length - 1}
                          onClick={() => moveSlide(slide.id, 1)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-30"
                          aria-label="Aşağı taşı"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={atMax}
                          onClick={() => duplicateSlide(slide.id)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 disabled:opacity-30"
                          aria-label="Kopyala"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={atMin}
                          onClick={() => removeSlide(slide.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 disabled:opacity-30"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {slide.imageUrl ? (
                      <p className="text-[10px] text-slate-500 truncate">Görsel yüklü</p>
                    ) : (
                      <p className="text-[10px] text-amber-600">Desktop görseli ekleyin</p>
                    )}
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={atMax}
              onClick={addSlide}
              className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-slate-300 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              Slide ekle
            </button>
            {atMax && <FieldHint>Maksimum {HERO_SLIDE_MAX} slide eklenebilir.</FieldHint>}
          </SettingCard>

          <SettingCard title="Slider ayarları">
            <ToggleSwitch
              label="Otomatik geçiş"
              checked={slider.autoplay}
              onChange={v => patchSlider({ autoplay: v })}
            />
            <SliderField
              label="Geçiş süresi"
              value={slider.intervalMs}
              onChange={v => patchSlider({ intervalMs: v })}
              min={3000}
              max={10000}
              step={500}
              unit="ms"
            />
            <ToggleSwitch
              label="Okları göster"
              checked={slider.showArrows}
              onChange={v => patchSlider({ showArrows: v })}
            />
            <ToggleSwitch
              label="Noktaları göster"
              checked={slider.showDots}
              onChange={v => patchSlider({ showDots: v })}
            />
            <SegmentControl<HeroSlideTransition>
              value={slider.transition}
              options={[
                { id: 'fade', label: 'Fade' },
                { id: 'slide', label: 'Slide' },
              ]}
              onChange={v => patchSlider({ transition: v })}
            />
          </SettingCard>
        </>
      )}
    </div>
  );
}
