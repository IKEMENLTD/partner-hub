export enum CompanyRole {
  // 現行値
  ORDERER = 'orderer',
  PRIME_CONTRACTOR = 'prime_contractor',
  SALES_LEAD = 'sales_lead',
  SERVICE_PROVIDER = 'service_provider',
  // DB旧値（データ0件だがenum定義に残存、デシリアライズ互換のため保持）
  PRIME = 'prime',
  SUBCONTRACTOR = 'subcontractor',
  PARTNER = 'partner',
  CLIENT = 'client',
}
