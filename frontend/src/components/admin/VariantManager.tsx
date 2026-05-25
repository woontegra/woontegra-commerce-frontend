import { useState } from 'react';
import { Button, Input, Card, Badge } from '../ui';
import type { ProductVariant } from '../../types';

interface VariantManagerProps {
  variants: Partial<ProductVariant>[];
  onChange: (variants: Partial<ProductVariant>[]) => void;
}

export default function VariantManager({ variants, onChange }: VariantManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    sku: '',
  });

  const handleAdd = () => {
    if (!formData.name || !formData.price || !formData.stock) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    const newVariant: Partial<ProductVariant> = {
      id: `temp-${Date.now()}`,
      name: formData.name,
      price: parseFloat(formData.price),
      stock: parseInt(formData.stock),
      sku: formData.sku || undefined,
      isActive: true,
    };

    if (editingIndex !== null) {
      const updated = [...variants];
      updated[editingIndex] = newVariant;
      onChange(updated);
      setEditingIndex(null);
    } else {
      onChange([...variants, newVariant]);
    }

    setFormData({ name: '', price: '', stock: '', sku: '' });
    setShowForm(false);
  };

  const handleEdit = (index: number) => {
    const variant = variants[index];
    setFormData({
      name: variant.name || '',
      price: variant.price?.toString() || '',
      stock: variant.stock?.toString() || '',
      sku: variant.sku || '',
    });
    setEditingIndex(index);
    setShowForm(true);
  };

  const handleDelete = (index: number) => {
    if (confirm('Bu varyantı silmek istediğinizden emin misiniz?')) {
      onChange(variants.filter((_, i) => i !== index));
    }
  };

  const handleCancel = () => {
    setFormData({ name: '', price: '', stock: '', sku: '' });
    setEditingIndex(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Ürün Varyantları</h3>
        {!showForm && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowForm(true)}
          >
            + Varyant Ekle
          </Button>
        )}
      </div>

      {/* Variant List */}
      {variants.length > 0 && (
        <div className="space-y-2">
          {variants.map((variant, index) => (
            <Card key={variant.id || index} padding="sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{variant.name}</span>
                    <Badge color="emerald">
                      {variant.stock} adet
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-600">
                    <span className="font-semibold">${variant.price}</span>
                    {variant.sku && <span className="ml-3">SKU: {variant.sku}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(index)}
                  >
                    Düzenle
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card padding="md">
          <h4 className="font-medium text-gray-900 mb-4">
            {editingIndex !== null ? 'Varyant Düzenle' : 'Yeni Varyant'}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Varyant Adı *"
              placeholder="örn: Kırmızı / XL"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <Input
              label="Fiyat *"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            />
            <Input
              label="Stok *"
              type="number"
              placeholder="0"
              value={formData.stock}
              onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
            />
            <Input
              label="SKU (Opsiyonel)"
              placeholder="PROD-001"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button onClick={handleAdd} size="sm">
              {editingIndex !== null ? 'Güncelle' : 'Ekle'}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              İptal
            </Button>
          </div>
        </Card>
      )}

      {variants.length === 0 && !showForm && (
        <div className="text-center py-8 text-gray-500 text-sm">
          Henüz varyant eklenmedi. Varyant eklemek için yukarıdaki butona tıklayın.
        </div>
      )}
    </div>
  );
}
