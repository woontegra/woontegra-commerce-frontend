import Modal from '../ui/Modal';
import ProductForm from '../forms/ProductForm';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProductModal({ isOpen, onClose }: ProductModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Yeni Ürün Ekle"
      size="lg"
    >
      <ProductForm
        onSuccess={onClose}
        onCancel={onClose}
      />
    </Modal>
  );
}
