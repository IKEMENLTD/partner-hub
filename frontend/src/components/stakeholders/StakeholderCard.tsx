import { useState } from 'react';
import clsx from 'clsx';
import { Edit, Trash2, Mail, Phone, Star, MoreVertical } from 'lucide-react';
import type { ProjectStakeholder, StakeholderTier } from '@/types';
import { getUserDisplayName, getPartnerDisplayName } from '@/types';
import { Avatar, Badge, Card } from '@/components/common';

interface StakeholderCardProps {
  stakeholder: ProjectStakeholder;
  onEdit?: (stakeholder: ProjectStakeholder) => void;
  onDelete?: (stakeholder: ProjectStakeholder) => void;
  showActions?: boolean;
  className?: string;
}

const tierConfig: Record<StakeholderTier, { label: string; color: string; bgColor: string }> = {
  1: {
    label: 'Tier 1',
    color: 'text-blue-700 dark:text-blue-300',
    bgColor: 'bg-blue-100 dark:bg-blue-900',
  },
  2: {
    label: 'Tier 2',
    color: 'text-green-700 dark:text-green-300',
    bgColor: 'bg-green-100 dark:bg-green-900',
  },
  3: {
    label: 'Tier 3',
    color: 'text-gray-700 dark:text-gray-300',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
  },
};

function getStakeholderName(stakeholder: ProjectStakeholder): string {
  if (stakeholder.user) {
    return getUserDisplayName(stakeholder.user);
  }
  if (stakeholder.partner) {
    return getPartnerDisplayName(stakeholder.partner);
  }
  return '不明';
}

function getStakeholderAvatar(stakeholder: ProjectStakeholder): {
  src?: string | null;
  name: string;
} {
  if (stakeholder.user) {
    return {
      src: stakeholder.user.avatarUrl,
      name: getUserDisplayName(stakeholder.user),
    };
  }
  if (stakeholder.partner) {
    return {
      src: null,
      name: getPartnerDisplayName(stakeholder.partner),
    };
  }
  return { src: null, name: '不明' };
}

export function StakeholderCard({
  stakeholder,
  onEdit,
  onDelete,
  showActions = true,
  className,
}: StakeholderCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const tier = tierConfig[stakeholder.tier];
  const avatarInfo = getStakeholderAvatar(stakeholder);
  const name = getStakeholderName(stakeholder);

  const email =
    stakeholder.contactInfo?.email ||
    stakeholder.user?.email ||
    stakeholder.partner?.email;
  const phone =
    stakeholder.contactInfo?.phone || stakeholder.partner?.phone;

  return (
    <Card
      className={clsx(
        'relative transition-shadow hover:shadow-md',
        className
      )}
      padding="md"
    >
      {/* Key Person Badge */}
      {stakeholder.isKeyPerson && (
        <div className="absolute -top-2 -right-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-yellow-400 text-yellow-900 shadow-sm">
            <Star className="h-3.5 w-3.5 fill-current" />
          </span>
        </div>
      )}

      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar
          src={avatarInfo.src}
          name={avatarInfo.name}
          size="lg"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
              {name}
            </h4>
            <Badge
              className={clsx(tier.bgColor, tier.color)}
              size="sm"
            >
              {tier.label}
            </Badge>
            {stakeholder.isPrimary && (
              <Badge variant="primary" size="sm">
                主担当
              </Badge>
            )}
          </div>

          {/* Role */}
          {stakeholder.roleDescription && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {stakeholder.roleDescription}
            </p>
          )}

          {/* Responsibilities */}
          {stakeholder.responsibilities && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-500 line-clamp-2">
              {stakeholder.responsibilities}
            </p>
          )}

          {/* Contact Info */}
          <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500 dark:text-gray-400">
            {email && (
              <a
                href={`mailto:${email}`}
                className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate max-w-[180px]">{email}</span>
              </a>
            )}
            {phone && (
              <a
                href={`tel:${phone}`}
                className="inline-flex items-center gap-1 hover:text-primary-600 dark:hover:text-primary-400"
              >
                <Phone className="h-3.5 w-3.5" />
                <span>{phone}</span>
              </a>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        {showActions && (onEdit || onDelete) && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-700 dark:hover:text-gray-300"
              aria-label="アクションメニュー"
            >
              <MoreVertical className="h-4 w-4" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 z-20 w-36 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg py-1">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onEdit(stakeholder);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      <Edit className="h-4 w-4" />
                      編集
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        onDelete(stakeholder);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                      削除
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Contract Amount */}
      {stakeholder.contractAmount && stakeholder.contractAmount > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
          <p className="text-xs text-gray-500 dark:text-gray-400">契約金額</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            ¥{stakeholder.contractAmount.toLocaleString()}
          </p>
        </div>
      )}
    </Card>
  );
}

// コンパクト版のカード
interface StakeholderCardCompactProps {
  stakeholder: ProjectStakeholder;
  onClick?: () => void;
  className?: string;
}

export function StakeholderCardCompact({
  stakeholder,
  onClick,
  className,
}: StakeholderCardCompactProps) {
  const tier = tierConfig[stakeholder.tier];
  const avatarInfo = getStakeholderAvatar(stakeholder);
  const name = getStakeholderName(stakeholder);

  return (
    <div
      className={clsx(
        'flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800',
        onClick && 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="relative">
        <Avatar
          src={avatarInfo.src}
          name={avatarInfo.name}
          size="sm"
        />
        {stakeholder.isKeyPerson && (
          <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-yellow-400 flex items-center justify-center">
            <Star className="h-2.5 w-2.5 text-yellow-900 fill-current" />
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
          {name}
        </p>
        {stakeholder.roleDescription && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
            {stakeholder.roleDescription}
          </p>
        )}
      </div>
      <Badge
        className={clsx(tier.bgColor, tier.color)}
        size="sm"
      >
        {tier.label}
      </Badge>
    </div>
  );
}
