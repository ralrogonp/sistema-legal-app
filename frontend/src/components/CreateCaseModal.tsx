import { useState } from 'react';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, files: File[]) => void;
  isSubmitting?: boolean;
}

export default function CreateCaseModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  isSubmitting = false 
}: CreateCaseModalProps) {
  const { user } = useAuthStore();
  const [formData, setFormData] = useState({
    titulo: '',
    tipo_caso: user?.role === 'ADMIN' ? 'CONTABLE' : user?.role || 'CONTABLE',
    cliente_nombre: '',
    cliente_rfc: '',
    descripcion: ''
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.titulo.trim()) {
      toast.error('El título es obligatorio');
      return;
    }
    if (!formData.cliente_nombre.trim()) {
      toast.error('El nombre del cliente es obligatorio');
      return;
    }
    if (!formData.descripcion.trim()) {
      toast.error('La descripción es obligatoria');
      return;
    }

    onSubmit(formData, selectedFiles);
  };

  const handleFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      validateAndAddFiles(newFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const newFiles = Array.from(e.dataTransfer.files);
    validateAndAddFiles(newFiles);
  };

  const validateAndAddFiles = (newFiles: File[]) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const validFiles: File[] = [];

    newFiles.forEach(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el tamaño máximo de 50MB`);
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} archivo(s) agregado(s)`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold">Nuevo Caso</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
            disabled={isSubmitting}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {/* Título */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Título del Caso *
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej: Auditoría fiscal 2024"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Tipo de Caso */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Tipo de Caso *
              </label>
              <select
                required
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={formData.tipo_caso}
                onChange={(e) => setFormData({ ...formData, tipo_caso: e.target.value })}
                disabled={user?.role !== 'ADMIN' || isSubmitting}
              >
                <option value="CONTABLE">CONTABLE</option>
                <option value="JURIDICO">JURIDICO</option>
              </select>
              {user?.role !== 'ADMIN' && (
                <p className="text-xs text-gray-500 mt-1">
                  Tu rol determina el tipo de caso
                </p>
              )}
            </div>

            {/* Información del Cliente */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Nombre del Cliente *
                </label>
                <input
                  type="text"
                  required
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Empresa ABC S.A."
                  value={formData.cliente_nombre}
                  onChange={(e) => setFormData({ ...formData, cliente_nombre: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  RFC del Cliente
                </label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="ABC123456XYZ"
                  value={formData.cliente_rfc}
                  onChange={(e) => setFormData({ ...formData, cliente_rfc: e.target.value.toUpperCase() })}
                  maxLength={13}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Descripción *
              </label>
              <textarea
                required
                rows={4}
                className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe los detalles del caso..."
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            {/* Zona de Upload de Documentos */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Documentos Iniciales (Opcional)
              </label>
              
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`border-2 border-dashed rounded-lg p-6 text-center transition ${
                  isDragging 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400'
                } ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <CloudArrowUpIcon className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 mb-2">
                  {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o'}
                </p>
                <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium text-sm">
                  selecciona archivos
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFilesSelect}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                    disabled={isSubmitting}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, Word, Excel, imágenes (máx. 50MB c/u)
                </p>
              </div>

              {/* Lista de archivos seleccionados */}
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-gray-700">
                    Archivos seleccionados ({selectedFiles.length}):
                  </p>
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <DocumentIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700"
                        disabled={isSubmitting}
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Creando...
                </span>
              ) : (
                'Crear Caso'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
