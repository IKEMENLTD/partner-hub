import { useState } from 'react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  User,
  Mail,
  Calendar,
  Shield,
  Edit,
  Key,
  Save,
} from 'lucide-react';
import { useAuthStore } from '@/store';
import { getUserDisplayName } from '@/types';
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Button,
  Input,
  Avatar,
  Badge,
  useToast,
} from '@/components/common';
import { authService } from '@/services/authService';
import { supabase } from '@/lib/supabase';
import { ApiError } from '@/services/api';

export function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { addToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit form state
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const handleEditStart = () => {
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setFirstName(user?.firstName || '');
    setLastName(user?.lastName || '');
  };

  const handleEditSave = async () => {
    setIsSaving(true);
    try {
      const response = await authService.updateProfile({ firstName, lastName });
      updateUser(response.data);
      addToast({
        type: 'success',
        title: 'プロフィールを更新しました',
      });
      setIsEditing(false);
    } catch (error) {
      const message = error instanceof ApiError
        ? error.message
        : 'プロフィールの更新に失敗しました';
      addToast({
        type: 'error',
        title: 'エラー',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');

    if (newPassword !== confirmPassword) {
      setPasswordError('新しいパスワードが一致しません');
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError('パスワードは8文字以上で入力してください');
      return;
    }

    setIsSaving(true);
    try {
      // Supabase Authでパスワード変更
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      addToast({
        type: 'success',
        title: 'パスワードを変更しました',
      });
      setIsChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'パスワードの変更に失敗しました';
      addToast({
        type: 'error',
        title: 'エラー',
        message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string | undefined) => {
    switch (role) {
      case 'admin':
        return { label: '管理者', variant: 'danger' as const };
      default:
        return { label: 'メンバー', variant: 'default' as const };
    }
  };

  const roleInfo = getRoleLabel(user?.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
          <p className="mt-1 text-gray-600">
            プロフィール情報を確認・編集できます
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <Card>
            <CardHeader
              action={
                !isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit className="h-4 w-4" />}
                    onClick={handleEditStart}
                  >
                    編集
                  </Button>
                )
              }
            >
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-gray-500" />
                <span>基本情報</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <Avatar
                  src={user?.avatarUrl}
                  name={getUserDisplayName(user) || 'User'}
                  size="xl"
                />
                <div className="flex-1 space-y-4">
                  {isEditing ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input
                          label="姓"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          required
                        />
                        <Input
                          label="名"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          required
                        />
                      </div>
                      <Input
                        label="メールアドレス"
                        value={user?.email || ''}
                        disabled
                        helperText="メールアドレスの変更は管理者にお問い合わせください"
                      />
                    </>
                  ) : (
                    <>
                      <div>
                        <p className="text-sm text-gray-500">氏名</p>
                        <p className="text-lg font-medium text-gray-900">
                          {getUserDisplayName(user) || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">メールアドレス</p>
                        <p className="text-gray-900">{user?.email || '-'}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
            {isEditing && (
              <CardFooter>
                <Button variant="ghost" onClick={handleEditCancel}>
                  キャンセル
                </Button>
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handleEditSave}
                  isLoading={isSaving}
                >
                  保存
                </Button>
              </CardFooter>
            )}
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader
              action={
                !isChangingPassword && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Key className="h-4 w-4" />}
                    onClick={() => setIsChangingPassword(true)}
                  >
                    パスワードを変更
                  </Button>
                )
              }
            >
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-gray-500" />
                <span>パスワード</span>
              </div>
            </CardHeader>
            <CardContent>
              {isChangingPassword ? (
                <div className="space-y-4">
                  <Input
                    label="現在のパスワード"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <Input
                    label="新しいパスワード"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="8文字以上で入力してください"
                    required
                  />
                  <Input
                    label="新しいパスワード（確認）"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={passwordError}
                    required
                  />
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  セキュリティのため、定期的にパスワードを変更することをお勧めします。
                </p>
              )}
            </CardContent>
            {isChangingPassword && (
              <CardFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setPasswordError('');
                  }}
                >
                  キャンセル
                </Button>
                <Button
                  leftIcon={<Save className="h-4 w-4" />}
                  onClick={handlePasswordChange}
                  isLoading={isSaving}
                >
                  パスワードを変更
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Role & Status */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-gray-500" />
                <span>権限</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">ロール</span>
                <Badge variant={roleInfo.variant}>{roleInfo.label}</Badge>
              </div>
              <p className="text-sm text-gray-500">
                {user?.role === 'admin'
                  ? '全ての機能にアクセスできます。'
                  : '案件・タスクの操作と進捗報告が可能です。管理機能はアクセスできません。'}
              </p>
            </CardContent>
          </Card>

          {/* Account Info */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-gray-500" />
                <span>アカウント情報</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">アカウントID</span>
                <span className="text-gray-900 font-mono text-xs">
                  {user?.id?.slice(0, 8) || '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">登録日</span>
                <span className="text-gray-900">
                  {user?.createdAt
                    ? format(new Date(user.createdAt), 'yyyy/M/d', { locale: ja })
                    : '-'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">最終更新</span>
                <span className="text-gray-900">
                  {user?.updatedAt
                    ? format(new Date(user.updatedAt), 'yyyy/M/d', { locale: ja })
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-gray-500" />
                <span>連絡先</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <a
                    href={`mailto:${user?.email}`}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {user?.email || '-'}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
