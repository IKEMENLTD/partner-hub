import { ApiProperty } from '@nestjs/swagger';

export class StakeholderNodeDto {
  @ApiProperty({ description: 'Stakeholder ID' })
  id: string;

  @ApiProperty({ description: 'Project ID' })
  projectId: string;

  @ApiProperty({ description: 'Partner ID', nullable: true })
  partnerId: string | null;

  @ApiProperty({ description: 'Partner information', nullable: true })
  partner: {
    id: string;
    name: string;
    email: string;
    companyName?: string;
  } | null;

  @ApiProperty({ description: 'Role description' })
  roleDescription: string;

  @ApiProperty({ description: 'Contract amount', nullable: true })
  contractAmount: number | null;

  @ApiProperty({ description: 'Is primary stakeholder' })
  isPrimary: boolean;

  @ApiProperty({ description: 'Tier level' })
  tier: number;

  @ApiProperty({ description: 'Parent stakeholder ID', nullable: true })
  parentStakeholderId: string | null;

  @ApiProperty({ description: 'Child stakeholders', type: [StakeholderNodeDto] })
  children: StakeholderNodeDto[];

  @ApiProperty({ description: 'Created at timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at timestamp' })
  updatedAt: Date;
}

export class StakeholderTreeResponseDto {
  @ApiProperty({ description: 'Tier 1 stakeholders (primary)', type: [StakeholderNodeDto] })
  tier1: StakeholderNodeDto[];

  @ApiProperty({ description: 'Tier 2 stakeholders (secondary)', type: [StakeholderNodeDto] })
  tier2: StakeholderNodeDto[];

  @ApiProperty({ description: 'Tier 3 stakeholders (tertiary)', type: [StakeholderNodeDto] })
  tier3: StakeholderNodeDto[];
}
