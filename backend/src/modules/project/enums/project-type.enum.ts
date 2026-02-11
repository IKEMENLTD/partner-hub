export enum ProjectType {
  // 現行値
  SUBSIDY = 'subsidy',
  ASP = 'asp',
  DEVELOPMENT = 'development',
  SERVICE = 'service',
  MAINTENANCE = 'maintenance',
  SUPPORT = 'support',
  OTHER = 'other',
  // DB旧値（データ0件だがenum定義に残存、デシリアライズ互換のため保持）
  JOINT_DEVELOPMENT = 'joint_development',
  SALES_PARTNERSHIP = 'sales_partnership',
  TECHNOLOGY_LICENSE = 'technology_license',
  RESELLER_AGREEMENT = 'reseller_agreement',
  CONSULTING = 'consulting',
}
