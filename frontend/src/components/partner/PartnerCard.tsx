import { Link } from 'react-router-dom';
import { Building, Mail, Phone, Star, MapPin } from 'lucide-react';
import type { Partner } from '@/types';
import { Badge, Card } from '@/components/common';

interface PartnerCardProps {
  partner: Partner;
  onClick?: () => void;
}

const statusConfig = {
  active: { label: 'アクティブ', variant: 'success' as const },
  inactive: { label: '非アクティブ', variant: 'default' as const },
  pending: { label: '申請中', variant: 'warning' as const },
  suspended: { label: '停止中', variant: 'danger' as const },
};

export function PartnerCard({ partner, onClick }: PartnerCardProps) {
  const status = statusConfig[partner.status] ?? { label: partner.status, variant: 'default' as const };

  return (
    <Card
      hoverable
      className="cursor-pointer"
      onClick={onClick}
      role="article"
      aria-label={`パートナー: ${partner.name}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-gray-100 p-2 dark:bg-slate-700">
            <Building className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <Link
              to={`/partners/${partner.id}`}
              className="text-base font-semibold text-gray-900 hover:text-primary-600"
              onClick={(e) => e.stopPropagation()}
            >
              {partner.name}
            </Link>
            {partner.companyName && (
              <p className="text-sm text-gray-500">{partner.companyName}</p>
            )}
          </div>
        </div>
        <Badge variant={status.variant}>{status.label}</Badge>
      </div>

      {/* Contact info */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0">
          <Mail className="h-4 w-4 shrink-0 text-gray-400" />
          <span className="truncate">{partner.email}</span>
        </div>
        {partner.phone && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0">
            <Phone className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{partner.phone}</span>
          </div>
        )}
        {partner.address && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 min-w-0">
            <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
            <span className="truncate">{partner.address}</span>
          </div>
        )}
      </div>

      {/* Rating and skills */}
      <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
        {partner.rating !== undefined && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
            <span className="text-sm font-medium text-gray-700">
              {Number(partner.rating).toFixed(1)}
            </span>
          </div>
        )}
        <div className="flex flex-wrap gap-1">
          {(partner.skills || []).slice(0, 3).map((skill) => (
            <span
              key={skill}
              className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-400"
            >
              {skill}
            </span>
          ))}
          {(partner.skills || []).length > 3 && (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-slate-700 dark:text-gray-400">
              +{(partner.skills || []).length - 3}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
