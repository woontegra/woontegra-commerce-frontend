import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { tr } from '../constants/translations';
import { sectionTypes, createSection, type Section } from '../components/builder/SectionLibrary';
import SortableSectionPreview from '../components/builder/SortableSectionPreview';
import Button from '../components/ui/Button';


export default function PageBuilder() {
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [pageTitle, setPageTitle] = useState('Yeni Sayfa');
  const [pageSlug, setPageSlug] = useState('yeni-sayfa');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Drag & Drop sensors for performance
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const addSection = (type: string) => {
    const newSection = createSection(type);
    setSections([...sections, newSection]);
  };

  const updateSection = (updatedSection: Section) => {
    setSections(sections.map((s) => (s.id === updatedSection.id ? updatedSection : s)));
    setEditingSection(null);
  };

  const savePage = () => {
    const pageData = {
      title: pageTitle,
      slug: pageSlug,
      sections: sections,
      isPublished: false,
    };
    console.log('💾 Sayfa Kaydediliyor:', pageData);
    alert('Sayfa kaydedildi! ✅');
  };

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
  };

  const handleEditSection = (section: Section) => {
    setEditingSection(section);
  };

  const handleDeleteSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedSectionId === id) {
      setSelectedSectionId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Top Bar */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <input
                type="text"
                value={pageTitle}
                onChange={(e) => setPageTitle(e.target.value)}
                className="text-lg sm:text-2xl font-bold border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 flex-1 min-w-0"
                placeholder="Sayfa Başlığı"
              />
              <input
                type="text"
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value)}
                className="hidden sm:block text-sm text-gray-600 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="sayfa-slug"
              />
            </div>
            <Button onClick={savePage}>
              {tr.savePage}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar - Section Library */}
        <div className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-white border-r min-h-screen transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                🧱 Bölümler
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-2">
              {Object.values(sectionTypes).map((type) => (
                <button
                  key={type.id}
                  onClick={() => {
                    addSection(type.id);
                    setSidebarOpen(false);
                  }}
                  className="w-full flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:border-blue-500 transition"
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium text-gray-700">{type.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Canvas - Preview Area */}
        <div className="flex-1 bg-gray-50 min-h-screen w-full lg:w-auto">
          {sections.length === 0 ? (
            <div className="flex items-center justify-center min-h-[600px]">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">
                  Sayfanızı Oluşturmaya Başlayın
                </h3>
                <p className="text-gray-600">
                  Sol panelden bölüm ekleyerek başlayın
                </p>
              </div>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sections.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="flex flex-col gap-4 sm:gap-6 p-4 sm:p-6 pb-20 lg:pb-6">
                  {sections.map((section) => (
                    <SortableSectionPreview
                      key={section.id}
                      section={section}
                      isSelected={selectedSectionId === section.id}
                      onSelect={() => handleSelectSection(section.id)}
                      onEdit={() => handleEditSection(section)}
                      onDelete={() => handleDeleteSection(section.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Edit Panel */}
        {editingSection && (
          <div className="fixed lg:static inset-y-0 right-0 z-40 w-full sm:w-96 bg-white border-l min-h-screen transform transition-transform duration-300 ease-in-out">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-800">{tr.editSection}</h2>
                <button
                  onClick={() => setEditingSection(null)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {Object.entries(editingSection.content).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </label>
                    {typeof value === 'string' ? (
                      value.length > 50 ? (
                        <textarea
                          value={value}
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: { ...editingSection.content, [key]: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: { ...editingSection.content, [key]: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      )
                    ) : (
                      <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-xl">
                        {typeof value} (gelişmiş düzenleme)
                      </div>
                    )}
                  </div>
                ))}

                <Button
                  onClick={() => updateSection(editingSection)}
                  className="w-full"
                >
                  {tr.update}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
