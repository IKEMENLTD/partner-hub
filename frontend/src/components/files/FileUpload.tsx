import { useState, useCallback, useRef } from 'react';
import { Upload, X, AlertCircle, FileText, Image as ImageIcon, File } from 'lucide-react';
import { Button } from '@/components/common';
import type { FileCategory } from '@/types';

interface FileUploadProps {
  projectId: string;
  taskId?: string;
  onUpload: (file: File, projectId: string, taskId?: string, category?: FileCategory) => void;
  isUploading?: boolean;
  maxSize?: number; // in bytes
  allowedExtensions?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_EXTENSIONS = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif'];

export function FileUpload({
  projectId,
  taskId,
  onUpload,
  isUploading = false,
  maxSize = DEFAULT_MAX_SIZE,
  allowedExtensions = DEFAULT_ALLOWED_EXTENSIONS,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxSize) {
        return `ファイルサイズが上限（${Math.round(maxSize / 1024 / 1024)}MB）を超えています`;
      }

      // Check file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowedExtensions.includes(extension)) {
        return `許可されていないファイル形式です。許可される形式: ${allowedExtensions.join(', ')}`;
      }

      return null;
    },
    [maxSize, allowedExtensions]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      setError(null);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        setSelectedFile(file);
      }
    },
    [validateFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const files = e.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        const validationError = validateFile(file);
        if (validationError) {
          setError(validationError);
          return;
        }
        setSelectedFile(file);
      }
    },
    [validateFile]
  );

  const handleUpload = useCallback(() => {
    if (selectedFile) {
      onUpload(selectedFile, projectId, taskId);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [selectedFile, onUpload, projectId, taskId]);

  const handleRemove = useCallback(() => {
    setSelectedFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const getFileIcon = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension)) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
    }
    if (['pdf', 'doc', 'docx'].includes(extension)) {
      return <FileText className="h-8 w-8 text-red-500" />;
    }
    return <File className="h-8 w-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileSelect}
          accept={allowedExtensions.map((ext) => `.${ext}`).join(',')}
          disabled={isUploading}
        />
        <div className="space-y-2">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-medium text-primary-600">
              クリックしてファイルを選択
            </span>
            <span className="text-gray-500"> またはドラッグ＆ドロップ</span>
          </div>
          <p className="text-xs text-gray-500">
            {allowedExtensions.join(', ').toUpperCase()} (最大{' '}
            {Math.round(maxSize / 1024 / 1024)}MB)
          </p>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Selected file preview */}
      {selectedFile && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile)}
            <div>
              <p className="text-sm font-medium text-gray-900 truncate max-w-xs">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[44px] min-w-[44px]"
              onClick={handleRemove}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="min-h-[44px]"
              onClick={handleUpload}
              isLoading={isUploading}
            >
              アップロード
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
