import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Partner } from './entities/partner.entity';
import { Project } from '../project/entities/project.entity';
import { CreatePartnerDto, UpdatePartnerDto, QueryPartnerDto } from './dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { PartnerStatus } from './enums/partner-status.enum';

// SECURITY FIX: Whitelist of allowed sort columns to prevent SQL injection
const ALLOWED_SORT_COLUMNS = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
  'status',
  'type',
  'rating',
  'totalProjects',
  'completedProjects',
  'country',
  'companyName',
];

@Injectable()
export class PartnerService {
  private readonly logger = new Logger(PartnerService.name);

  constructor(
    @InjectRepository(Partner)
    private partnerRepository: Repository<Partner>,
    @InjectRepository(Project)
    private projectRepository: Repository<Project>,
  ) {}

  async create(
    createPartnerDto: CreatePartnerDto,
    createdById: string,
  ): Promise<Partner> {
    // Check if partner with email already exists
    const existingPartner = await this.partnerRepository.findOne({
      where: { email: createPartnerDto.email },
    });
    if (existingPartner) {
      throw new ConflictException('Partner with this email already exists');
    }

    const partner = this.partnerRepository.create({
      ...createPartnerDto,
      createdById,
    });

    await this.partnerRepository.save(partner);
    this.logger.log(`Partner created: ${partner.name} (${partner.id})`);

    return partner;
  }

  async findAll(
    queryDto: QueryPartnerDto,
  ): Promise<PaginatedResponseDto<Partner>> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
      status,
      type,
      search,
      skills,
      country,
    } = queryDto;

    const queryBuilder = this.partnerRepository.createQueryBuilder('partner');

    // Apply filters
    if (status) {
      queryBuilder.andWhere('partner.status = :status', { status });
    }

    if (type) {
      queryBuilder.andWhere('partner.type = :type', { type });
    }

    if (search) {
      queryBuilder.andWhere(
        '(partner.name ILIKE :search OR partner.email ILIKE :search OR partner.companyName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (country) {
      queryBuilder.andWhere('partner.country = :country', { country });
    }

    if (skills && skills.length > 0) {
      // PostgreSQL array overlap check
      queryBuilder.andWhere('partner.skills && :skills', {
        skills: skills,
      });
    }

    // SECURITY FIX: Validate sortBy against whitelist to prevent SQL injection
    const safeSortBy = ALLOWED_SORT_COLUMNS.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`partner.${safeSortBy}`, sortOrder);

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: string): Promise<Partner> {
    const partner = await this.partnerRepository.findOne({
      where: { id },
      relations: ['user', 'createdBy'],
    });

    if (!partner) {
      throw new NotFoundException(`Partner with ID "${id}" not found`);
    }

    return partner;
  }

  async findByEmail(email: string): Promise<Partner | null> {
    return this.partnerRepository.findOne({ where: { email } });
  }

  async update(id: string, updatePartnerDto: UpdatePartnerDto): Promise<Partner> {
    const partner = await this.findOne(id);

    // Check email uniqueness if changing email
    if (updatePartnerDto.email && updatePartnerDto.email !== partner.email) {
      const existingPartner = await this.partnerRepository.findOne({
        where: { email: updatePartnerDto.email },
      });
      if (existingPartner) {
        throw new ConflictException('Partner with this email already exists');
      }
    }

    Object.assign(partner, updatePartnerDto);
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner updated: ${partner.name} (${partner.id})`);

    return partner;
  }

  async updateStatus(id: string, status: PartnerStatus): Promise<Partner> {
    const partner = await this.findOne(id);
    partner.status = status;
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner status updated: ${partner.name} -> ${status}`);

    return partner;
  }

  async updateRating(id: string, rating: number): Promise<Partner> {
    const partner = await this.findOne(id);
    partner.rating = rating;
    await this.partnerRepository.save(partner);

    this.logger.log(`Partner rating updated: ${partner.name} -> ${rating}`);

    return partner;
  }

  async incrementProjectCount(
    id: string,
    completed: boolean = false,
  ): Promise<void> {
    const partner = await this.findOne(id);
    partner.totalProjects += 1;
    if (completed) {
      partner.completedProjects += 1;
    }
    await this.partnerRepository.save(partner);
  }

  async remove(id: string): Promise<void> {
    const partner = await this.findOne(id);
    await this.partnerRepository.remove(partner);
    this.logger.log(`Partner deleted: ${partner.name} (${id})`);
  }

  async getActivePartners(): Promise<Partner[]> {
    return this.partnerRepository.find({
      where: { status: PartnerStatus.ACTIVE },
    });
  }

  async getPartnersBySkills(skills: string[]): Promise<Partner[]> {
    return this.partnerRepository
      .createQueryBuilder('partner')
      .where('partner.status = :status', { status: PartnerStatus.ACTIVE })
      .andWhere('partner.skills && :skills', { skills })
      .orderBy('partner.rating', 'DESC')
      .getMany();
  }

  async getPartnerStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    pending: number;
    averageRating: number;
  }> {
    const [total, active, inactive, pending] = await Promise.all([
      this.partnerRepository.count(),
      this.partnerRepository.count({ where: { status: PartnerStatus.ACTIVE } }),
      this.partnerRepository.count({ where: { status: PartnerStatus.INACTIVE } }),
      this.partnerRepository.count({ where: { status: PartnerStatus.PENDING } }),
    ]);

    const avgResult = await this.partnerRepository
      .createQueryBuilder('partner')
      .select('AVG(partner.rating)', 'avg')
      .where('partner.rating > 0')
      .getRawOne();

    return {
      total,
      active,
      inactive,
      pending,
      averageRating: parseFloat(avgResult?.avg || '0'),
    };
  }

  async getProjectsByPartner(partnerId: string): Promise<Project[]> {
    // Verify partner exists
    await this.findOne(partnerId);

    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.partners', 'partners')
      .leftJoinAndSelect('project.owner', 'owner')
      .leftJoinAndSelect('project.manager', 'manager')
      .where('partners.id = :partnerId', { partnerId })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }
}
