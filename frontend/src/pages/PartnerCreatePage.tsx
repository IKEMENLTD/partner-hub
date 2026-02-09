import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Save, X } from 'lucide-react';
import { usePartner, useCreatePartner, useUpdatePartner } from '@/hooks';
import type { PartnerInput, PartnerType, PartnerStatus } from '@/types';
import {
  Button,
  Input,
  TextArea,
  Select,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Alert,
  PageLoading,
} from '@/components/common';

const TYPE_OPTIONS = [
  { value: 'individual', label: '個人' },
  { value: 'company', label: '法人' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'アクティブ' },
  { value: 'inactive', label: '非アクティブ' },
  { value: 'pending', label: '保留中' },
];

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  description?: string;
}

export function PartnerCreatePage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const { data: partnerData, isLoading: isLoadingPartner } = usePartner(id);
  const { mutate: createPartner, isPending: isCreating, error: createError } = useCreatePartner();
  const { mutate: updatePartner, isPending: isUpdating, error: updateError } = useUpdatePartner();

  const [formData, setFormData] = useState<PartnerInput>({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    type: 'individual',
    status: 'pending',
    description: '',
    skills: [],
    address: '',
    country: '',
  });

  const [skillInput, setSkillInput] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});

  // Load existing partner data when editing
  useEffect(() => {
    if (isEditMode && partnerData) {
      setFormData({
        name: partnerData.name,
        email: partnerData.email,
        phone: partnerData.phone || '',
        companyName: partnerData.companyName || '',
        type: partnerData.type,
        status: partnerData.status,
        description: partnerData.description || '',
        skills: partnerData.skills || [],
        address: partnerData.address || '',
        country: partnerData.country || '',
      });
    }
  }, [isEditMode, partnerData]);

  const isPending = isCreating || isUpdating;
  const error = createError || updateError;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'パートナー名は必須です';
    } else if (formData.name.length > 100) {
      newErrors.name = 'パートナー名は100文字以内で入力してください';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'メールアドレスは必須です';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '有効なメールアドレスを入力してください';
    }

    if (formData.phone && !/^[\d\-+().\s]*$/.test(formData.phone)) {
      newErrors.phone = '有効な電話番号を入力してください';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Clean up empty optional fields
    const submitData: PartnerInput = {
      ...formData,
      phone: formData.phone || undefined,
      companyName: formData.companyName || undefined,
      description: formData.description || undefined,
      address: formData.address || undefined,
      country: formData.country || undefined,
    };

    if (isEditMode && id) {
      updatePartner(
        { id, data: submitData },
        {
          onSuccess: () => {
            navigate(`/partners/${id}`);
          },
        }
      );
    } else {
      createPartner(submitData, {
        onSuccess: (response) => {
          navigate(`/partners/${response.id}`);
        },
      });
    }
  };

  const handleChange = (
    field: keyof PartnerInput,
    value: string | string[] | undefined
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleAddSkill = () => {
    const skill = skillInput.trim();
    if (skill && !formData.skills?.includes(skill)) {
      setFormData((prev) => ({ ...prev, skills: [...(prev.skills || []), skill] }));
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((skill) => skill !== skillToRemove),
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSkill();
    }
  };

  if (isEditMode && isLoadingPartner) {
    return <PageLoading />;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          to="/partners"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          aria-label="パートナー一覧に戻る"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'パートナー編集' : '新規パートナー登録'}
          </h1>
          <p className="text-gray-600">
            {isEditMode
              ? 'パートナー情報を更新してください'
              : 'パートナーの基本情報を入力してください'}
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="error">
          {isEditMode
            ? 'パートナーの更新に失敗しました。入力内容を確認してください。'
            : 'パートナーの登録に失敗しました。入力内容を確認してください。'}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>基本情報</CardHeader>
          <CardContent className="space-y-6">
            {/* Name */}
            <Input
              label="パートナー名"
              name="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              error={errors.name}
              placeholder="氏名または担当者名を入力"
              required
            />

            {/* Email */}
            <Input
              label="メールアドレス"
              name="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={errors.email}
              placeholder="example@email.com"
              required
            />

            <div className="grid-form">
              {/* Phone */}
              <Input
                label="電話番号"
                name="phone"
                type="tel"
                value={formData.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                error={errors.phone}
                placeholder="03-1234-5678"
                helperText="省略可能"
              />

              {/* Company Name */}
              <Input
                label="会社名"
                name="companyName"
                value={formData.companyName || ''}
                onChange={(e) => handleChange('companyName', e.target.value)}
                error={errors.companyName}
                placeholder="株式会社〇〇"
                helperText="法人の場合は入力"
              />
            </div>

            <div className="grid-form">
              {/* Type */}
              <Select
                label="タイプ"
                name="type"
                value={formData.type || 'individual'}
                onChange={(e) => handleChange('type', e.target.value as PartnerType)}
                options={TYPE_OPTIONS}
              />

              {/* Status */}
              <Select
                label="ステータス"
                name="status"
                value={formData.status || 'pending'}
                onChange={(e) => handleChange('status', e.target.value as PartnerStatus)}
                options={STATUS_OPTIONS}
              />
            </div>

            {/* Description */}
            <TextArea
              label="説明"
              name="description"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="パートナーの概要、専門分野、経歴などを入力"
              rows={4}
              helperText="省略可能"
            />

            {/* Skills (Tags Input) */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                スキル
              </label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="スキルを入力してEnter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddSkill}
                  disabled={!skillInput.trim()}
                >
                  追加
                </Button>
              </div>
              {formData.skills && formData.skills.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-700"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="rounded-full p-0.5 hover:bg-primary-200"
                        aria-label={`${skill}を削除`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-1.5 text-sm text-gray-500">
                プログラミング言語、フレームワーク、専門分野などを追加
              </p>
            </div>

            <div className="grid-form">
              {/* Address */}
              <Input
                label="住所"
                name="address"
                value={formData.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                placeholder="東京都渋谷区..."
                helperText="省略可能"
              />

              {/* Country */}
              <Input
                label="国"
                name="country"
                value={formData.country || ''}
                onChange={(e) => handleChange('country', e.target.value)}
                placeholder="日本"
                helperText="省略可能"
              />
            </div>
          </CardContent>

          <CardFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/partners')}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              isLoading={isPending}
              leftIcon={<Save className="h-4 w-4" />}
            >
              {isEditMode ? '更新' : '登録'}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
