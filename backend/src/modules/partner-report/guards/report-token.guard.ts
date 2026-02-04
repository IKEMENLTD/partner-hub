import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { ResourceNotFoundException } from '../../../common/exceptions/resource-not-found.exception';
import { AuthenticationException } from '../../../common/exceptions/business.exception';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PartnerReportToken } from '../entities/partner-report-token.entity';

@Injectable()
export class ReportTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(PartnerReportToken)
    private tokenRepository: Repository<PartnerReportToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.params.token;

    if (!token) {
      throw new AuthenticationException('AUTH_001', {
        message: 'Report token is required',
        userMessage: '報告用トークンが必要です',
      });
    }

    const reportToken = await this.tokenRepository.findOne({
      where: { token },
      relations: ['partner', 'project'],
    });

    if (!reportToken) {
      throw new ResourceNotFoundException('AUTH_001', {
        resourceType: 'ReportToken',
        resourceId: token,
        userMessage: '無効なトークンです',
      });
    }

    if (!reportToken.isValid()) {
      if (!reportToken.isActive) {
        throw new AuthenticationException('AUTH_003', {
          message: 'Token has been deactivated',
          userMessage: 'このトークンは無効化されています',
        });
      }
      if (reportToken.expiresAt && new Date() > reportToken.expiresAt) {
        throw new AuthenticationException('AUTH_003', {
          message: 'Token has expired',
          userMessage: 'このトークンは有効期限が切れています',
        });
      }
    }

    // リクエストにトークン情報を付与
    request.reportToken = reportToken;
    request.partner = reportToken.partner;
    request.organizationId = reportToken.organizationId;

    // last_used_at を更新
    await this.tokenRepository.update(reportToken.id, {
      lastUsedAt: new Date(),
    });

    return true;
  }
}
