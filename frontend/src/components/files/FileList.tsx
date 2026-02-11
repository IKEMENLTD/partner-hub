import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
} from 'lucide-react';
import {
  Badge,
  EmptyState,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  InlineLoading,
} from '@/components/common';
import type { ProjectFile, FileCategory } from '@/types';

interface FileListProps {
  files: ProjectFile[];
  isLoading?: boolean;
  onDownload?: (fileId: string) => void;
}

const categoryConfig: Record<FileCategory, { label: string; variant: 'default' | 'info' | 'primary' }> = {
  document: { label: 'ドキュメント', variant: 'info' },
  image: { label: '画像', variant: 'primary' },
  other: { label: 'その他', variant: 'default' },
};

export function FileList({
  files,
  isLoading = false,
  onDownload,
}: FileListProps) {
  const getFileIcon = (mimeType: string, category: FileCategory) => {
    if (category === 'image' || mimeType.startsWith('image/')) {
      return <ImageIcon className="h-5 w-5 text-blue-500" />;
    }
    if (
      category === 'document' ||
      mimeType.includes('pdf') ||
      mimeType.includes('document')
    ) {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <InlineLoading />
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-10 w-10" />}
        title="ファイルがありません"
        description="ファイルをアップロードすると、ここに表示されます"
        className="py-8"
      />
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ファイル名</TableHead>
              <TableHead>カテゴリ</TableHead>
              <TableHead>サイズ</TableHead>
              <TableHead>アップロード者</TableHead>
              <TableHead>アップロード日</TableHead>
              <TableHead className="w-10">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const category = categoryConfig[file.category];
              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {getFileIcon(file.mimeType, file.category)}
                      <span className="font-medium text-gray-900 truncate max-w-xs">
                        {file.originalName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={category.variant}>{category.label}</Badge>
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {formatFileSize(file.fileSize)}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {file.uploader
                      ? `${file.uploader.lastName} ${file.uploader.firstName}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-gray-500">
                    {format(new Date(file.createdAt), 'yyyy/MM/dd HH:mm', {
                      locale: ja,
                    })}
                  </TableCell>
                  <TableCell>
                    <button
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-gray-100 rounded-lg transition-colors"
                      onClick={() => onDownload?.(file.id)}
                      title="ダウンロード"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
