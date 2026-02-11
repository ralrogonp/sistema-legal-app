import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CloudArrowUpIcon, 
  FolderIcon, 
  DocumentIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  FolderPlusIcon
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// APIs para S3
const s3API = {
  getFolders: () => axios.get(`${API_URL}/s3/folders`),
  createFolder: (data: any) => axios.post(`${API_URL}/s3/folders`, data),
  getFiles: (folderId?: number) => axios.get(`${API_URL}/s3/files`, { params: { folderId } }),
  uploadFile: (formData: FormData) => axios.post(`${API_URL}/s3/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteFile: (id: number) => axios.delete(`${API_URL}/s3/files/${id}`),
  downloadFile: (id: number) => axios.get(`${API_URL}/s3/files/${id}/download`, {
    responseType: 'blob'
  })
};

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  accept?: string;
  maxSize?: number;
  multiple?: boolean;
}

function FileUploadZone({ 
  onFilesSelected, 
  accept = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',
  maxSize = 50 * 1024 * 1024, // 50MB
  multiple = true 
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} excede el tamaño máximo de ${maxSize / 1024 / 1024}MB`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length > 0) {
      onFilesSelected(validFiles);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
    }
  };

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
        isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'
      }`}
    >
      <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
      <p className="text-gray-600 mb-2">
        {isDragging ? 'Suelta los archivos aquí' : 'Arrastra archivos aquí o'}
      </p>
      <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
        selecciona archivos
        <input
          type="file"
          multiple={multiple}
          className="hidden"
          onChange={handleFileSelect}
          accept={accept}
        />
      </label>
      <p className="text-xs text-gray-500 mt-2">
        Máximo {maxSize / 1024 / 1024}MB por archivo
      </p>
    </div>
  );
}

export default function DocumentsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [uploadingFiles, setUploadingFiles] = useState<File[]>([]);

  // Queries
  const { data: folders } = useQuery({
    queryKey: ['s3-folders'],
    queryFn: () => s3API.getFolders().then(res => res.data.data)
  });

  const { data: files, isLoading } = useQuery({
    queryKey: ['s3-files', selectedFolder],
    queryFn: () => s3API.getFiles(selectedFolder || undefined).then(res => res.data.data)
  });

  // Mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: any) => s3API.createFolder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s3-folders'] });
      toast.success('Carpeta creada exitosamente');
      setIsCreatingFolder(false);
      setNewFolderName('');
    },
    onError: () => toast.error('Error al crear carpeta')
  });

  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => s3API.uploadFile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s3-files'] });
      toast.success('Archivo subido exitosamente');
      setUploadingFiles([]);
    },
    onError: () => toast.error('Error al subir archivo')
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => s3API.deleteFile(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['s3-files'] });
      toast.success('Archivo eliminado');
    },
    onError: () => toast.error('Error al eliminar archivo')
  });

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      toast.error('Ingresa un nombre para la carpeta');
      return;
    }

    createFolderMutation.mutate({
      nombre: newFolderName.trim(),
      carpeta_padre_id: selectedFolder
    });
  };

  const handleFilesSelected = (files: File[]) => {
    setUploadingFiles(files);
    
    files.forEach(file => {
      const formData = new FormData();
      formData.append('file', file);
      if (selectedFolder) {
        formData.append('carpeta_id', selectedFolder.toString());
      }
      
      uploadMutation.mutate(formData);
    });
  };

  const handleDownload = async (file: any) => {
    try {
      const response = await s3API.downloadFile(file.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.nombre_archivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Descarga iniciada');
    } catch (error) {
      toast.error('Error al descargar archivo');
    }
  };

  const handleDelete = (id: number, nombre: string) => {
    if (confirm(`¿Eliminar ${nombre}?`)) {
      deleteMutation.mutate(id);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Documentos S3</h1>
        {isAdmin && (
          <button
            onClick={() => setIsCreatingFolder(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <FolderPlusIcon className="w-5 h-5" />
            Nueva Carpeta
          </button>
        )}
      </div>

      {/* Modal crear carpeta */}
      {isCreatingFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Nueva Carpeta</h2>
            <input
              type="text"
              placeholder="Nombre de la carpeta"
              className="w-full border rounded px-3 py-2 mb-4"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={createFolderMutation.isPending}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {createFolderMutation.isPending ? 'Creando...' : 'Crear'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Carpetas */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <FolderIcon className="w-5 h-5" />
              Carpetas
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedFolder(null)}
                className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                  selectedFolder === null ? 'bg-blue-50 text-blue-600 font-medium' : ''
                }`}
              >
                📁 Todas las carpetas
              </button>
              {folders?.map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => setSelectedFolder(folder.id)}
                  className={`w-full text-left px-3 py-2 rounded hover:bg-gray-100 ${
                    selectedFolder === folder.id ? 'bg-blue-50 text-blue-600 font-medium' : ''
                  }`}
                >
                  📁 {folder.nombre}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main content - Archivos */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg shadow p-6">
            {/* Upload zone */}
            <div className="mb-6">
              <FileUploadZone onFilesSelected={handleFilesSelected} />
            </div>

            {/* Progress de uploads */}
            {uploadingFiles.length > 0 && uploadMutation.isPending && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  Subiendo {uploadingFiles.length} archivo(s)...
                </p>
              </div>
            )}

            {/* Lista de archivos */}
            <div>
              <h3 className="font-semibold mb-4">
                {selectedFolder 
                  ? `Archivos en ${folders?.find((f: any) => f.id === selectedFolder)?.nombre}`
                  : 'Todos los archivos'
                }
              </h3>

              {isLoading ? (
                <div className="text-center py-12 text-gray-500">
                  Cargando archivos...
                </div>
              ) : files?.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay archivos en esta carpeta
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {files?.map((file: any) => (
                    <div
                      key={file.id}
                      className="border rounded-lg p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-3">
                        <DocumentIcon className="w-8 h-8 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate" title={file.nombre_archivo}>
                            {file.nombre_archivo}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(file.tamano_bytes)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(file.fecha_subida).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => handleDownload(file)}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100"
                        >
                          <ArrowDownTrayIcon className="w-4 h-4" />
                          Descargar
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(file.id, file.nombre_archivo)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
