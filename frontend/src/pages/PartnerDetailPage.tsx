import { useState, useEffect, useCallback } from 'react';
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
  FolderKanban,
  FileText,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Smile,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { usePartner, usePartnerProjects, useDeletePartner, usePartnerReports, getProgressStatusLabel } from '@/hooks';
import { api } from '@/services/api';
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
  Alert,
} from '@/components/common';
import { ProjectCard } from '@/components/project';
import { PartnerEvaluationCard } from '@/components/partner';

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const },
  inactive: { label: '非アクティブ', variant: 'default' as const },
  pending: { label: '申請中', variant: 'warning' as const },
  suspended: { label: '停止中', variant: 'danger' as const },
};

interface ReportTokenInfo {
  token: {
    id: string;
    token: string;
    expiresAt: string;
    isActive: boolean;
  } | null;
  reportUrl: string | null;
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error, refetch } = usePartner(id);
  const { data: projectsData } = usePartnerProjects(id);
  const { data: reportsData, isLoading: isLoadingReports } = usePartnerReports(id);
  const { mutate: deletePartner, isPending: isDeleting } = useDeletePartner();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reportToken, setReportToken] = useState<ReportTokenInfo | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [isSendingSetup, setIsSendingSetup] = useState(false);
  const [setupSent, setSetupSent] = useState(false);
  const [isDeactivatingToken, setIsDeactivatingToken] = useState(false);

  // Fetch report token
  const fetchReportToken = useCallback(async () => {
    if (!id) return;
    try {
      const response = await api.get<{ success: boolean; data: ReportTokenInfo }>(`/partners/${id}/report-token`);
      // Handle wrapped response { success: true, data: {...} }
      const tokenData = response.data || response;
      setReportToken(tokenData as ReportTokenInfo);
      setTokenError(null);
    } catch (err: unknown) {
      console.error('Failed to fetch report token:', err);
      // Don't show error for 404 (no token yet)
      const errorStatus = (err as { status?: number })?.status;
      if (errorStatus !== 404) {
        setTokenError('トークンの取得に失敗しました');
      }
    }
  }, [id]);

  // Generate report token
  const handleGenerateToken = async (regenerate: boolean = false) => {
    if (!id) return;
    setIsGeneratingToken(true);
    setTokenError(null);
    try {
      const endpoint = regenerate
        ? `/partners/${id}/report-token/regenerate`
        : `/partners/${id}/report-token`;
      const response = await api.post<{ success: boolean; data: ReportTokenInfo & { message?: string } }>(endpoint, {});
      // Handle wrapped response { success: true, data: {...} }
      const tokenData = response.data || response;
      setReportToken(tokenData as ReportTokenInfo);
    } catch (err: unknown) {
      console.error('Failed to generate token:', err);
      const errorMessage = (err as { message?: string })?.message;
      setTokenError(errorMessage || 'トークンの生成に失敗しました');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Copy report URL
  const handleCopyUrl = () => {
    if (reportToken?.reportUrl) {
      navigator.clipboard.writeText(reportToken.reportUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  // Send contact setup email
  const handleSendContactSetup = async () => {
    if (!id) return;
    setIsSendingSetup(true);
    try {
      await api.post(`/partner-contact-setup/send/${id}`, {});
      setSetupSent(true);
      setTimeout(() => setSetupSent(false), 3000);
    } catch (err) {
      console.error('Failed to send contact setup:', err);
    } finally {
      setIsSendingSetup(false);
    }
  };

  // Deactivate report token
  const handleDeactivateToken = async () => {
    if (!id) return;
    setIsDeactivatingToken(true);
    try {
      await api.post(`/partners/${id}/report-token/deactivate`, {});
      setReportToken(null);
    } catch (err) {
      console.error('Failed to deactivate token:', err);
    } finally {
      setIsDeactivatingToken(false);
    }
  };

  // Fetch report token on mount
  useEffect(() => {
    if (id) {
      fetchReportToken();
    }
  }, [id, fetchReportToken]);

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

        <div className="page-header sm:!items-start">
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

          {/* パートナー評価 */}
          <PartnerEvaluationCard partnerId={partner.id} />

          {/* 連絡先設定リンク送信 */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-primary-500" />
                <span>連絡先設定</span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500 mb-3">
                パートナーに連絡先設定用のリンクをメールで送信します
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendContactSetup}
                isLoading={isSendingSetup}
                leftIcon={<Mail className="h-4 w-4" />}
              >
                設定リンクを送信
              </Button>
              {setupSent && (
                <p className="text-sm text-green-600 mt-2">送信しました</p>
              )}
            </CardContent>
          </Card>

          {/* Report URL */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5 text-primary-500" />
                <span>報告用URL</span>
              </div>
            </CardHeader>
            <CardContent>
              {tokenError && (
                <Alert variant="error" className="mb-3">
                  {tokenError}
                </Alert>
              )}
              {reportToken?.reportUrl ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={reportToken.reportUrl}
                      className="flex-1 rounded-lg border-gray-300 bg-gray-50 text-sm px-3 py-2"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyUrl}
                      leftIcon={copiedUrl ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    >
                      {copiedUrl ? 'コピー済み' : 'コピー'}
                    </Button>
                  </div>
                  {reportToken.token?.expiresAt && (
                    <p className="text-xs text-gray-500">
                      有効期限: {new Date(reportToken.token.expiresAt).toLocaleDateString('ja-JP')}
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateToken(true)}
                    isLoading={isGeneratingToken}
                  >
                    URLを再生成
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={handleDeactivateToken}
                    isLoading={isDeactivatingToken}
                  >
                    トークンを無効化
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500 mb-3">
                    パートナーが報告を送信するためのURLを生成できます
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleGenerateToken(false)}
                    isLoading={isGeneratingToken}
                    leftIcon={<LinkIcon className="h-4 w-4" />}
                  >
                    URLを生成
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Partner Reports */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary-500" />
                <span>報告履歴</span>
                {reportsData && reportsData.length > 0 && (
                  <span className="text-sm font-normal text-gray-500">
                    ({reportsData.length}件)
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="py-8 text-center text-gray-500">読み込み中...</div>
              ) : reportsData && reportsData.length > 0 ? (
                <div className="space-y-3">
                  {reportsData.slice(0, 5).map((report) => (
                    <div key={report.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        {report.progressStatus ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            report.progressStatus === 'on_track' ? 'bg-green-100 text-green-800' :
                            report.progressStatus === 'slightly_delayed' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {report.progressStatus === 'on_track' && <Smile className="h-3 w-3" />}
                            {report.progressStatus === 'slightly_delayed' && <AlertTriangle className="h-3 w-3" />}
                            {report.progressStatus === 'has_issues' && <XCircle className="h-3 w-3" />}
                            {getProgressStatusLabel(report.progressStatus)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {report.reportType}
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {format(new Date(report.createdAt), 'M/d HH:mm', { locale: ja })}
                        </span>
                      </div>
                      {report.project && (
                        <p className="text-xs text-gray-500 mb-1">案件: {report.project.name}</p>
                      )}
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {report.weeklyAccomplishments || report.content || '（詳細なし）'}
                      </p>
                      {!report.isRead && (
                        <span className="inline-block mt-2 text-xs text-primary-600 font-medium">未読</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={<FileText className="h-10 w-10" />}
                  title="報告がありません"
                  description="パートナーからの報告がここに表示されます"
                  className="py-8"
                />
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
