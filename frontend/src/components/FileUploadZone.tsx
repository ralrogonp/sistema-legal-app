import { useCallback, useState } from 'react'
import { CloudArrowUpIcon, DocumentIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface FileUploadZoneProps {
  onFilesSelected: (files: File[]) => void
  accept?: string
  maxSize?: number // en bytes
  multiple?: boolean
  maxFiles?: number
}

export default function FileUploadZone({ 
  onFilesSelected, 
  accept = '*',
  maxSize = 10485760, // 10MB default
  multiple = true,
  maxFiles = 10
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<string[]>([])

  const validateFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newErrors: string[] = []
    const validFiles: File[] = []

    fileArray.forEach(file => {
      // Validar tamaño
      if (file.size > maxSize) {
        newErrors.push(`${file.name} excede el tamaño máximo de ${(maxSize / 1048576).toFixed(1)}MB`)
        return
      }
      
      validFiles.push(file)
    })

    // Validar cantidad
    const totalFiles = selectedFiles.length + validFiles.length
    if (totalFiles > maxFiles) {
      newErrors.push(`Máximo ${maxFiles} archivos permitidos`)
      return
    }

    setErrors(newErrors)
    
    if (validFiles.length > 0) {
      const newSelectedFiles = multiple ? [...selectedFiles, ...validFiles] : validFiles
      setSelectedFiles(newSelectedFiles)
      onFilesSelected(newSelectedFiles)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    validateFiles(e.dataTransfer.files)
  }, [selectedFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      validateFiles(e.target.files)
    }
  }

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index)
    setSelectedFiles(newFiles)
    onFilesSelected(newFiles)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / 1048576).toFixed(1) + ' MB'
  }

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
        <div className="mt-4">
          <label htmlFor="file-upload" className="cursor-pointer">
            <span className="text-blue-600 hover:text-blue-500 font-medium">
              Selecciona archivos
            </span>
            <input
              id="file-upload"
              type="file"
              className="sr-only"
              multiple={multiple}
              accept={accept}
              onChange={handleFileInput}
            />
          </label>
          <p className="text-gray-600"> o arrastra y suelta aquí</p>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Máximo {(maxSize / 1048576).toFixed(0)}MB por archivo
        </p>
      </div>

      {/* Errores */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-red-600">• {error}</p>
          ))}
        </div>
      )}

      {/* Lista de archivos seleccionados */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Archivos seleccionados ({selectedFiles.length})
          </h4>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <DocumentIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(index)}
                className="ml-2 text-gray-400 hover:text-red-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
