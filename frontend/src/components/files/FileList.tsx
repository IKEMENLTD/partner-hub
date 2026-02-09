import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  FileText,
  Image as ImageIcon,
  File,
  Download,
  Trash2,
  MoreVertical,
  ExternalLink,
} from 'lucide-react';
import {
  Button,
  Badge,
  EmptyState,
  Modal,
  ModalFooter,
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
  onDelete?: (fileId: string) => void;
  onDownload?: (fileId: string) => void;
  isDeleting?: boolean;
}

const categoryConfig: Record<FileCategory, { label: string; variant: 'default' | 'info' | 'primary' }> = {
  document: { label: 'ドキュメント', variant: 'info' },
  image: { label: '画像', variant: 'primary' },
  other: { label: 'その他', variant: 'default' },
};

export function FileList({
  files,
  isLoading = false,
  onDelete,
  onDownload,
  isDeleting = false,
}: FileListProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

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

  const handleDelete = () => {
    if (deleteConfirmId && onDelete) {
      onDelete(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  const handleDownload = (fileId: string) => {
    if (onDownload) {
      onDownload(fileId);
    }
    setActionMenuId(null);
  };

  const fileToDelete = files.find((f) => f.id === deleteConfirmId);

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
              <TableHead className="w-10"></TableHead>
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
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px] min-w-[44px]"
                        onClick={() =>
                          setActionMenuId(actionMenuId === file.id ? null : file.id)
                        }
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                      {actionMenuId === file.id && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-md shadow-lg border z-10">
                          <button
                            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px]"
                            onClick={() => handleDownload(file.id)}
                          >
                            <Download className="h-4 w-4" />
                            ダウンロード
                          </button>
                          {file.publicUrl && (
                            <a
                              href={file.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 min-h-[44px]"
                              onClick={() => setActionMenuId(null)}
                            >
                              <ExternalLink className="h-4 w-4" />
                              新しいタブで開く
                            </a>
                          )}
                          {onDelete && (
                            <button
                              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 min-h-[44px]"
                              onClick={() => {
                                setDeleteConfirmId(file.id);
                                setActionMenuId(null);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                              削除
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="ファイルの削除"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          「{fileToDelete?.originalName}」を削除しますか？
          この操作は取り消せません。
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setDeleteConfirmId(null)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            削除
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
