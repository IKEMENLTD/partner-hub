import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  ArrowLeft,
  Edit,
  Trash2,
  Building,
  Mail,
  Phone,
  MapPin,
  Star,
  FolderKanban,
} from 'lucide-react';
import { usePartner, usePartnerProjects, useDeletePartner } from '@/hooks';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardContent,
  PageLoading,
  ErrorMessage,
  EmptyState,
  Modal,
  ModalFooter,
} from '@/components/common';
import { ProjectCard } from '@/components/project';

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const },
  inactive: { label: '非アクティブ', variant: 'default' as const },
  pending: { label: '申請中', variant: 'warning' as const },
  suspended: { label: '停止中', variant: 'danger' as const },
};

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = usePartner(id);
  const { data: projectsData } = usePartnerProjects(id);
  const { mutate: deletePartner, isPending: isDeleting } = useDeletePartner();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (isLoading) {
    return <PageLoading />;
  }

  if (error) {
    return (
      <ErrorMessage
        message="パートナー情報の読み込みに失敗しました"
        retry={() => refetch()}
      />
    );
  }

  const partner = data;
  if (!partner) {
    return <ErrorMessage message="パートナーが見つかりません" />;
  }

  const status = statusConfig[partner.status];
  const projects = projectsData || [];

  const handleDelete = () => {
    deletePartner(partner.id, {
      onSuccess: () => {
        navigate('/partners');
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link
          to="/partners"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          パートナー一覧に戻る
        </Link>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-gray-100 p-3">
              <Building className="h-8 w-8 text-gray-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {partner.name}
                </h1>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
              {partner.companyName && (
                <p className="mt-1 text-gray-600">{partner.companyName}</p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              leftIcon={<Edit className="h-4 w-4" />}
              as={Link}
              to={`/partners/${partner.id}/edit`}
            >
              編集
            </Button>
            <Button
              variant="danger"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={() => setShowDeleteConfirm(true)}
            >
              削除
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>説明</CardHeader>
            <CardContent>
              {partner.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{partner.description}</p>
              ) : (
                <p className="text-gray-400 italic">説明がありません</p>
              )}
            </CardContent>
          </Card>

          {/* Skills */}
          <Card>
            <CardHeader>スキル</CardHeader>
            <CardContent>
              {(partner.skills || []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(partner.skills || []).map((skill: string) => (
                    <Badge key={skill} variant="primary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 italic">スキルが設定されていません</p>
              )}
            </CardContent>
          </Card>

          {/* Projects */}
          <Card>
            <CardHeader
              action={
                <Link
                  to={`/projects?partnerId=${partner.id}`}
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  すべて表示
                </Link>
              }
            >
              関連案件
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <EmptyState
                  icon={<FolderKanban className="h-10 w-10" />}
                  title="関連案件がありません"
                  description="このパートナーに案件が割り当てられると、ここに表示されます"
                  className="py-8"
                />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {projects.slice(0, 4).map((project: import('@/types').Project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>連絡先</CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">メールアドレス</p>
                  <a
                    href={`mailto:${partner.email}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {partner.email}
                  </a>
                </div>
              </div>

              {partner.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">電話番号</p>
                    <a
                      href={`tel:${partner.phone}`}
                      className="text-sm text-primary-600 hover:text-primary-700"
                    >
                      {partner.phone}
                    </a>
                  </div>
                </div>
              )}

              {partner.address && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-gray-500">住所</p>
                    <p className="text-sm text-gray-700">{partner.address}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rating */}
          {partner.rating !== undefined && (
            <Card>
              <CardHeader>評価</CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-6 w-6 ${
                          star <= Number(partner.rating!)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-2xl font-bold text-gray-900">
                    {Number(partner.rating).toFixed(1)}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>登録情報</CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">登録日</span>
                <span className="text-gray-900">
                  {format(new Date(partner.createdAt), 'yyyy/M/d', { locale: ja })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最終更新</span>
                <span className="text-gray-900">
                  {format(new Date(partner.updatedAt), 'yyyy/M/d', { locale: ja })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="パートナーの削除"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          「{partner.name}」を削除しますか？
          この操作は取り消せません。
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)}>
            キャンセル
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            削除
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
