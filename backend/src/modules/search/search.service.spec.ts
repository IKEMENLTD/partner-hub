import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SearchService, SearchResultItem, SearchResults } from './search.service';
import { Project } from '../project/entities/project.entity';
import { Partner } from '../partner/entities/partner.entity';
import { Task } from '../task/entities/task.entity';
import { SearchQueryDto, SearchType } from './dto/search-query.dto';
import { UserRole } from '../auth/enums/user-role.enum';

describe('SearchService', () => {
  let service: SearchService;

  // --- Mock data ---

  const mockProject: Partial<Project> = {
    id: 'project-uuid-1',
    name: 'Test Project Alpha',
    description: 'A long description for the test project used in search tests',
    status: 'in_progress' as any,
    ownerId: 'user-uuid-1',
    managerId: 'user-uuid-2',
    createdById: 'user-uuid-1',
    progress: 60,
    healthScore: 85,
    owner: { id: 'user-uuid-1', fullName: 'Owner Name' } as any,
    manager: { id: 'user-uuid-2', fullName: 'Manager Name' } as any,
    updatedAt: new Date('2025-01-15'),
  };

  const mockProject2: Partial<Project> = {
    id: 'project-uuid-2',
    name: 'Another Project Beta',
    description: null as any,
    status: 'draft' as any,
    ownerId: 'user-uuid-3',
    managerId: null as any,
    createdById: 'user-uuid-3',
    progress: 0,
    healthScore: 100,
    owner: { id: 'user-uuid-3', fullName: 'Another Owner' } as any,
    manager: null as any,
    updatedAt: new Date('2025-01-10'),
  };

  const mockPartner: Partial<Partner> = {
    id: 'partner-uuid-1',
    name: 'Tanaka Taro',
    companyName: 'Acme Corporation',
    email: 'tanaka@acme.com',
    description: 'Leading technology partner specializing in cloud solutions',
    status: 'active' as any,
    type: 'company' as any,
    rating: 4.5,
    organizationId: 'org-uuid-1',
    updatedAt: new Date('2025-01-12'),
  };

  const mockPartner2: Partial<Partner> = {
    id: 'partner-uuid-2',
    name: 'Suzuki Hanako',
    companyName: null as any,
    email: 'suzuki@example.com',
    description: null as any,
    status: 'pending' as any,
    type: 'individual' as any,
    rating: 0,
    organizationId: 'org-uuid-1',
    updatedAt: new Date('2025-01-08'),
  };

  const mockTask: Partial<Task> = {
    id: 'task-uuid-1',
    title: 'Implement search feature',
    description: 'Build a global search feature for the platform',
    status: 'in_progress' as any,
    priority: 'high' as any,
    projectId: 'project-uuid-1',
    assigneeId: 'user-uuid-1',
    createdById: 'user-uuid-1',
    dueDate: new Date('2025-02-28'),
    project: { id: 'project-uuid-1', name: 'Test Project Alpha' } as any,
    assignee: { id: 'user-uuid-1', fullName: 'Owner Name' } as any,
    updatedAt: new Date('2025-01-14'),
  };

  const mockTask2: Partial<Task> = {
    id: 'task-uuid-2',
    title: 'Write unit tests',
    description: null as any,
    status: 'todo' as any,
    priority: 'medium' as any,
    projectId: 'project-uuid-1',
    assigneeId: 'user-uuid-2',
    createdById: 'user-uuid-1',
    dueDate: null as any,
    project: { id: 'project-uuid-1', name: 'Test Project Alpha' } as any,
    assignee: { id: 'user-uuid-2', fullName: 'Manager Name' } as any,
    updatedAt: new Date('2025-01-13'),
  };

  // --- Query builder mock factory ---

  const createMockQueryBuilder = (resolvedData: any[] = []) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(resolvedData),
  });

  // --- Repository mocks ---

  let mockProjectQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockPartnerQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockTaskQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  const mockProjectRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockPartnerRepository = {
    createQueryBuilder: jest.fn(),
  };

  const mockTaskRepository = {
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    mockProjectQueryBuilder = createMockQueryBuilder([mockProject]);
    mockPartnerQueryBuilder = createMockQueryBuilder([mockPartner]);
    mockTaskQueryBuilder = createMockQueryBuilder([mockTask]);

    mockProjectRepository.createQueryBuilder.mockReturnValue(mockProjectQueryBuilder);
    mockPartnerRepository.createQueryBuilder.mockReturnValue(mockPartnerQueryBuilder);
    mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(Partner),
          useValue: mockPartnerRepository,
        },
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);

    jest.clearAllMocks();

    // Re-assign after clearAllMocks so the query builders are fresh
    mockProjectQueryBuilder = createMockQueryBuilder([mockProject]);
    mockPartnerQueryBuilder = createMockQueryBuilder([mockPartner]);
    mockTaskQueryBuilder = createMockQueryBuilder([mockTask]);

    mockProjectRepository.createQueryBuilder.mockReturnValue(mockProjectQueryBuilder);
    mockPartnerRepository.createQueryBuilder.mockReturnValue(mockPartnerQueryBuilder);
    mockTaskRepository.createQueryBuilder.mockReturnValue(mockTaskQueryBuilder);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ========================================================================
  // search() - Main method
  // ========================================================================

  describe('search', () => {
    describe('with SearchType.ALL', () => {
      it('should search across all three entity types', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectRepository.createQueryBuilder).toHaveBeenCalledWith('project');
        expect(mockPartnerRepository.createQueryBuilder).toHaveBeenCalledWith('partner');
        expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalledWith('task');

        expect(result.projects).toHaveLength(1);
        expect(result.partners).toHaveLength(1);
        expect(result.tasks).toHaveLength(1);
        expect(result.total).toBe(3);
      });

      it('should compute total as the sum of all result arrays', async () => {
        mockProjectQueryBuilder.getMany.mockResolvedValue([mockProject, mockProject2]);
        mockPartnerQueryBuilder.getMany.mockResolvedValue([mockPartner]);
        mockTaskQueryBuilder.getMany.mockResolvedValue([mockTask, mockTask2]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.projects).toHaveLength(2);
        expect(result.partners).toHaveLength(1);
        expect(result.tasks).toHaveLength(2);
        expect(result.total).toBe(5);
      });
    });

    describe('with SearchType.PROJECTS', () => {
      it('should search only projects', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectRepository.createQueryBuilder).toHaveBeenCalled();
        expect(mockPartnerRepository.createQueryBuilder).not.toHaveBeenCalled();
        expect(mockTaskRepository.createQueryBuilder).not.toHaveBeenCalled();

        expect(result.projects).toHaveLength(1);
        expect(result.partners).toHaveLength(0);
        expect(result.tasks).toHaveLength(0);
        expect(result.total).toBe(1);
      });
    });

    describe('with SearchType.PARTNERS', () => {
      it('should search only partners', async () => {
        const query: SearchQueryDto = { q: 'acme', type: SearchType.PARTNERS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectRepository.createQueryBuilder).not.toHaveBeenCalled();
        expect(mockPartnerRepository.createQueryBuilder).toHaveBeenCalled();
        expect(mockTaskRepository.createQueryBuilder).not.toHaveBeenCalled();

        expect(result.partners).toHaveLength(1);
        expect(result.projects).toHaveLength(0);
        expect(result.tasks).toHaveLength(0);
        expect(result.total).toBe(1);
      });
    });

    describe('with SearchType.TASKS', () => {
      it('should search only tasks', async () => {
        const query: SearchQueryDto = { q: 'search', type: SearchType.TASKS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectRepository.createQueryBuilder).not.toHaveBeenCalled();
        expect(mockPartnerRepository.createQueryBuilder).not.toHaveBeenCalled();
        expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalled();

        expect(result.tasks).toHaveLength(1);
        expect(result.projects).toHaveLength(0);
        expect(result.partners).toHaveLength(0);
        expect(result.total).toBe(1);
      });
    });

    describe('default limit', () => {
      it('should use default limit of 10 when limit is not provided', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS };

        await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectQueryBuilder.take).toHaveBeenCalledWith(10);
      });

      it('should use provided limit when specified', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 25 };

        await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(mockProjectQueryBuilder.take).toHaveBeenCalledWith(25);
      });
    });

    describe('organizationId passthrough', () => {
      it('should pass organizationId to partner search', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };

        await service.search(query, 'user-uuid-1', UserRole.ADMIN, 'org-uuid-1');

        // The andWhere call for organizationId should have been made
        const andWhereCalls = mockPartnerQueryBuilder.andWhere.mock.calls;
        const orgFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('organizationId'),
        );
        expect(orgFilter).toBeDefined();
      });

      it('should not add organization filter when organizationId is undefined', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };

        await service.search(query, 'user-uuid-1', UserRole.ADMIN, undefined);

        // Only the deletedAt + ILIKE andWhere calls, no org filter
        const andWhereCalls = mockPartnerQueryBuilder.andWhere.mock.calls;
        const orgFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('organizationId'),
        );
        expect(orgFilter).toBeUndefined();
      });
    });

    describe('empty results', () => {
      it('should return empty arrays when no results are found', async () => {
        mockProjectQueryBuilder.getMany.mockResolvedValue([]);
        mockPartnerQueryBuilder.getMany.mockResolvedValue([]);
        mockTaskQueryBuilder.getMany.mockResolvedValue([]);

        const query: SearchQueryDto = { q: 'nonexistent', type: SearchType.ALL, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.projects).toHaveLength(0);
        expect(result.partners).toHaveLength(0);
        expect(result.tasks).toHaveLength(0);
        expect(result.total).toBe(0);
      });
    });
  });

  // ========================================================================
  // searchProjects (via search())
  // ========================================================================

  describe('searchProjects', () => {
    it('should build query with ILIKE search term', async () => {
      const query: SearchQueryDto = { q: 'alpha', type: SearchType.PROJECTS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%alpha%' },
      );
    });

    it('should join owner and manager relations', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('project.owner', 'owner');
      expect(mockProjectQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('project.manager', 'manager');
    });

    it('should filter by deletedAt IS NULL', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.where).toHaveBeenCalledWith('project.deletedAt IS NULL');
    });

    it('should order by updatedAt DESC', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.orderBy).toHaveBeenCalledWith('project.updatedAt', 'DESC');
    });

    describe('role-based filtering', () => {
      it('should NOT add user filter for ADMIN role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        await service.search(query, 'admin-uuid', UserRole.ADMIN);

        const andWhereCalls = mockProjectQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('ownerId'),
        );
        expect(userFilter).toBeUndefined();
      });

      it('should add user filter for MEMBER role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        await service.search(query, 'member-uuid', UserRole.MEMBER);

        const andWhereCalls = mockProjectQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('ownerId'),
        );
        expect(userFilter).toBeDefined();
        expect(userFilter![1]).toEqual({ userId: 'member-uuid' });
      });

      it('should add user filter for MANAGER role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        await service.search(query, 'manager-uuid', UserRole.MANAGER);

        const andWhereCalls = mockProjectQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('ownerId'),
        );
        expect(userFilter).toBeDefined();
        expect(userFilter![1]).toEqual({ userId: 'manager-uuid' });
      });

      it('should add user filter for PARTNER role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        await service.search(query, 'partner-uuid', UserRole.PARTNER);

        const andWhereCalls = mockProjectQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('ownerId'),
        );
        expect(userFilter).toBeDefined();
        expect(userFilter![1]).toEqual({ userId: 'partner-uuid' });
      });
    });

    describe('result mapping', () => {
      it('should map project entities to SearchResultItem format', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.projects).toHaveLength(1);
        const item = result.projects[0];
        expect(item.id).toBe('project-uuid-1');
        expect(item.type).toBe('project');
        expect(item.name).toBe('Test Project Alpha');
        expect(item.status).toBe('in_progress');
        expect(item.relevance).toBeGreaterThanOrEqual(0);
        expect(item.metadata).toEqual({
          ownerId: 'user-uuid-1',
          ownerName: 'Owner Name',
          managerId: 'user-uuid-2',
          managerName: 'Manager Name',
          progress: 60,
          healthScore: 85,
        });
      });

      it('should truncate description to 200 characters', async () => {
        const longDescription = 'A'.repeat(300);
        mockProjectQueryBuilder.getMany.mockResolvedValue([
          { ...mockProject, description: longDescription },
        ]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.projects[0].description).toHaveLength(200);
      });

      it('should handle null description gracefully', async () => {
        mockProjectQueryBuilder.getMany.mockResolvedValue([mockProject2]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.projects[0].description).toBeUndefined();
      });

      it('should handle null owner/manager names', async () => {
        mockProjectQueryBuilder.getMany.mockResolvedValue([mockProject2]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.PROJECTS, limit: 10 };
        const result = await service.search(query, 'user-uuid-3', UserRole.ADMIN);

        expect(result.projects[0].metadata?.ownerName).toBe('Another Owner');
        expect(result.projects[0].metadata?.managerName).toBeUndefined();
      });
    });
  });

  // ========================================================================
  // searchPartners (via search())
  // ========================================================================

  describe('searchPartners', () => {
    it('should build query with ILIKE on companyName, name, and email', async () => {
      const query: SearchQueryDto = { q: 'acme', type: SearchType.PARTNERS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockPartnerQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(partner.companyName ILIKE :searchTerm OR partner.name ILIKE :searchTerm OR partner.email ILIKE :searchTerm)',
        { searchTerm: '%acme%' },
      );
    });

    it('should filter by deletedAt IS NULL', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockPartnerQueryBuilder.where).toHaveBeenCalledWith('partner.deletedAt IS NULL');
    });

    it('should order by updatedAt DESC', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockPartnerQueryBuilder.orderBy).toHaveBeenCalledWith('partner.updatedAt', 'DESC');
    });

    it('should apply organization filter when organizationId is provided', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN, 'org-uuid-1');

      const andWhereCalls = mockPartnerQueryBuilder.andWhere.mock.calls;
      const orgFilter = andWhereCalls.find(
        (call: any[]) =>
          typeof call[0] === 'string' && call[0].includes('organizationId'),
      );
      expect(orgFilter).toBeDefined();
      expect(orgFilter![0]).toBe('partner.organizationId = :organizationId');
      expect(orgFilter![1]).toEqual({ organizationId: 'org-uuid-1' });
    });

    describe('result mapping', () => {
      it('should map partner entities to SearchResultItem format', async () => {
        const query: SearchQueryDto = { q: 'acme', type: SearchType.PARTNERS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.partners).toHaveLength(1);
        const item = result.partners[0];
        expect(item.id).toBe('partner-uuid-1');
        expect(item.type).toBe('partner');
        expect(item.name).toBe('Acme Corporation'); // companyName takes precedence
        expect(item.status).toBe('active');
        expect(item.relevance).toBeGreaterThanOrEqual(0);
        expect(item.metadata).toEqual({
          email: 'tanaka@acme.com',
          contactPerson: 'Tanaka Taro',
          companyName: 'Acme Corporation',
          type: 'company',
          rating: 4.5,
        });
      });

      it('should use name when companyName is null', async () => {
        mockPartnerQueryBuilder.getMany.mockResolvedValue([mockPartner2]);

        const query: SearchQueryDto = { q: 'suzuki', type: SearchType.PARTNERS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.partners[0].name).toBe('Suzuki Hanako');
      });

      it('should truncate partner description to 200 characters', async () => {
        const longDesc = 'B'.repeat(300);
        mockPartnerQueryBuilder.getMany.mockResolvedValue([
          { ...mockPartner, description: longDesc },
        ]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.PARTNERS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.partners[0].description).toHaveLength(200);
      });

      it('should handle null partner description', async () => {
        mockPartnerQueryBuilder.getMany.mockResolvedValue([mockPartner2]);

        const query: SearchQueryDto = { q: 'suzuki', type: SearchType.PARTNERS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.partners[0].description).toBeUndefined();
      });
    });
  });

  // ========================================================================
  // searchTasks (via search())
  // ========================================================================

  describe('searchTasks', () => {
    it('should build query with ILIKE on title and description', async () => {
      const query: SearchQueryDto = { q: 'search', type: SearchType.TASKS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockTaskQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(task.title ILIKE :searchTerm OR task.description ILIKE :searchTerm)',
        { searchTerm: '%search%' },
      );
    });

    it('should join project and assignee relations', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockTaskQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.project', 'project');
      expect(mockTaskQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith('task.assignee', 'assignee');
    });

    it('should filter by deletedAt IS NULL', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockTaskQueryBuilder.where).toHaveBeenCalledWith('task.deletedAt IS NULL');
    });

    it('should order by dueDate ASC NULLS LAST then updatedAt DESC', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockTaskQueryBuilder.orderBy).toHaveBeenCalledWith('task.dueDate', 'ASC', 'NULLS LAST');
      expect(mockTaskQueryBuilder.addOrderBy).toHaveBeenCalledWith('task.updatedAt', 'DESC');
    });

    describe('role-based filtering', () => {
      it('should NOT add user filter for ADMIN role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

        await service.search(query, 'admin-uuid', UserRole.ADMIN);

        const andWhereCalls = mockTaskQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('assigneeId'),
        );
        expect(userFilter).toBeUndefined();
      });

      it('should add user filter for MEMBER role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

        await service.search(query, 'member-uuid', UserRole.MEMBER);

        const andWhereCalls = mockTaskQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('assigneeId'),
        );
        expect(userFilter).toBeDefined();
        expect(userFilter![1]).toEqual({ userId: 'member-uuid' });
      });

      it('should add user filter for MANAGER role', async () => {
        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };

        await service.search(query, 'manager-uuid', UserRole.MANAGER);

        const andWhereCalls = mockTaskQueryBuilder.andWhere.mock.calls;
        const userFilter = andWhereCalls.find(
          (call: any[]) =>
            typeof call[0] === 'string' && call[0].includes('assigneeId'),
        );
        expect(userFilter).toBeDefined();
        expect(userFilter![1]).toEqual({ userId: 'manager-uuid' });
      });
    });

    describe('result mapping', () => {
      it('should map task entities to SearchResultItem format', async () => {
        const query: SearchQueryDto = { q: 'search', type: SearchType.TASKS, limit: 10 };

        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.tasks).toHaveLength(1);
        const item = result.tasks[0];
        expect(item.id).toBe('task-uuid-1');
        expect(item.type).toBe('task');
        expect(item.name).toBe('Implement search feature');
        expect(item.status).toBe('in_progress');
        expect(item.relevance).toBeGreaterThanOrEqual(0);
        expect(item.metadata).toEqual({
          projectId: 'project-uuid-1',
          projectName: 'Test Project Alpha',
          assigneeId: 'user-uuid-1',
          assigneeName: 'Owner Name',
          dueDate: new Date('2025-02-28'),
          priority: 'high',
        });
      });

      it('should truncate task description to 200 characters', async () => {
        const longDesc = 'C'.repeat(300);
        mockTaskQueryBuilder.getMany.mockResolvedValue([
          { ...mockTask, description: longDesc },
        ]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.tasks[0].description).toHaveLength(200);
      });

      it('should handle null task description', async () => {
        mockTaskQueryBuilder.getMany.mockResolvedValue([mockTask2]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.tasks[0].description).toBeUndefined();
      });

      it('should handle null project and assignee relations', async () => {
        mockTaskQueryBuilder.getMany.mockResolvedValue([
          {
            ...mockTask,
            project: null,
            assignee: null,
          },
        ]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.tasks[0].metadata?.projectName).toBeUndefined();
        expect(result.tasks[0].metadata?.assigneeName).toBeUndefined();
      });

      it('should handle null dueDate', async () => {
        mockTaskQueryBuilder.getMany.mockResolvedValue([mockTask2]);

        const query: SearchQueryDto = { q: 'test', type: SearchType.TASKS, limit: 10 };
        const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

        expect(result.tasks[0].metadata?.dueDate).toBeNull();
      });
    });
  });

  // ========================================================================
  // calculateRelevance (tested indirectly through search results)
  // ========================================================================

  describe('calculateRelevance', () => {
    it('should give highest score for exact name match', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Alpha', description: null },
      ]);

      const query: SearchQueryDto = { q: 'Alpha', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Exact match (case-insensitive) => 100 points
      expect(result.projects[0].relevance).toBe(100);
    });

    it('should give high score for starts-with match', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Alpha Project', description: null },
      ]);

      const query: SearchQueryDto = { q: 'Alpha', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Starts with => 80 points
      expect(result.projects[0].relevance).toBe(80);
    });

    it('should give medium score for whole-word match', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Project Alpha Beta', description: null },
      ]);

      const query: SearchQueryDto = { q: 'Alpha', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Contains as whole word => 60 points
      expect(result.projects[0].relevance).toBe(60);
    });

    it('should give lower score for substring match', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'ProjectAlphaBeta', description: null },
      ]);

      const query: SearchQueryDto = { q: 'Alpha', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Contains query (but not as whole word) => 40 points
      expect(result.projects[0].relevance).toBe(40);
    });

    it('should be case insensitive', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'alpha', description: null },
      ]);

      const query: SearchQueryDto = { q: 'ALPHA', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Exact match (case insensitive) => 100 points
      expect(result.projects[0].relevance).toBe(100);
    });

    it('should accumulate scores across multiple fields', async () => {
      // Name matches as substring, description also matches as substring
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        {
          ...mockProject,
          name: 'ProjectAlphaBeta',
          description: 'Includes alpha content',
        },
      ]);

      const query: SearchQueryDto = { q: 'alpha', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // name: contains 'alpha' => 40, description: whole word 'alpha' => 60
      // Total = 100
      expect(result.projects[0].relevance).toBe(100);
    });

    it('should return 0 for no match in any field', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'XYZ', description: 'Nothing here' },
      ]);

      const query: SearchQueryDto = { q: 'zzzzz', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects[0].relevance).toBe(0);
    });

    it('should handle null/undefined fields without error', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Test', description: null },
      ]);

      const query: SearchQueryDto = { q: 'Test', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects[0].relevance).toBe(100);
    });

    it('should accumulate relevance from partner extra fields (contactPerson)', async () => {
      // For partners, calculateRelevance receives: companyName||name, description, name
      // So 'name' field is passed as the third field
      mockPartnerQueryBuilder.getMany.mockResolvedValue([
        {
          ...mockPartner,
          companyName: 'XYZ Corp',
          name: 'Tanaka',
          description: null,
        },
      ]);

      const query: SearchQueryDto = { q: 'Tanaka', type: SearchType.PARTNERS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // companyName 'XYZ Corp' has no match => 0
      // description is null => 0
      // name 'Tanaka' exact match => 100
      expect(result.partners[0].relevance).toBe(100);
    });
  });

  // ========================================================================
  // escapeRegex (tested indirectly through relevance calculation)
  // ========================================================================

  describe('escapeRegex (via calculateRelevance)', () => {
    it('should handle special regex characters in query', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Project (v2.0)', description: null },
      ]);

      // Query contains regex special chars: ( ) .
      const query: SearchQueryDto = { q: '(v2.0)', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // Should not throw and should compute relevance
      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with square brackets', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'Project [Draft]', description: null },
      ]);

      const query: SearchQueryDto = { q: '[Draft]', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with asterisks and plus signs', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'C++ Project', description: null },
      ]);

      const query: SearchQueryDto = { q: 'C++', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with backslashes', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'path\\to\\file', description: null },
      ]);

      const query: SearchQueryDto = { q: 'path\\to', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with pipe and caret', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: 'test|pipe^caret', description: null },
      ]);

      const query: SearchQueryDto = { q: '|pipe^', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].relevance).toBeGreaterThanOrEqual(0);
    });

    it('should handle query with dollar sign and curly braces', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([
        { ...mockProject, name: '${variable}', description: null },
      ]);

      const query: SearchQueryDto = { q: '${variable}', type: SearchType.PROJECTS, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(1);
      // Exact match
      expect(result.projects[0].relevance).toBe(100);
    });
  });

  // ========================================================================
  // Edge cases
  // ========================================================================

  describe('Edge cases', () => {
    it('should handle single character search', async () => {
      const query: SearchQueryDto = { q: 'a', type: SearchType.ALL, limit: 10 };

      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result).toBeDefined();
      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%a%' },
      );
    });

    it('should handle search term with spaces', async () => {
      const query: SearchQueryDto = { q: 'test project', type: SearchType.ALL, limit: 10 };

      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%test project%' },
      );
    });

    it('should handle search with Japanese characters', async () => {
      const query: SearchQueryDto = { q: 'テスト案件', type: SearchType.ALL, limit: 10 };

      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result).toBeDefined();
      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%テスト案件%' },
      );
    });

    it('should handle search with percent signs in query (SQL wildcard)', async () => {
      const query: SearchQueryDto = { q: '50%', type: SearchType.PROJECTS, limit: 10 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      // The search term wraps with %, so inner % from query is preserved
      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%50%%' },
      );
    });

    it('should handle empty string query', async () => {
      const query: SearchQueryDto = { q: '', type: SearchType.ALL, limit: 10 };

      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result).toBeDefined();
      expect(mockProjectQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(project.name ILIKE :searchTerm OR project.description ILIKE :searchTerm)',
        { searchTerm: '%%' },
      );
    });

    it('should handle multiple results from different entity types', async () => {
      mockProjectQueryBuilder.getMany.mockResolvedValue([mockProject, mockProject2]);
      mockPartnerQueryBuilder.getMany.mockResolvedValue([mockPartner, mockPartner2]);
      mockTaskQueryBuilder.getMany.mockResolvedValue([mockTask, mockTask2]);

      const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result.projects).toHaveLength(2);
      expect(result.partners).toHaveLength(2);
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(6);
    });

    it('should respect limit parameter', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 5 };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(mockPartnerQueryBuilder.take).toHaveBeenCalledWith(5);
      expect(mockTaskQueryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('should use limit=10 as default when limit is undefined', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.ALL };

      await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(mockProjectQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockPartnerQueryBuilder.take).toHaveBeenCalledWith(10);
      expect(mockTaskQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  // ========================================================================
  // SearchResults interface structure
  // ========================================================================

  describe('SearchResults structure', () => {
    it('should always return the correct interface shape', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      expect(result).toHaveProperty('projects');
      expect(result).toHaveProperty('partners');
      expect(result).toHaveProperty('tasks');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.projects)).toBe(true);
      expect(Array.isArray(result.partners)).toBe(true);
      expect(Array.isArray(result.tasks)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('should return correct SearchResultItem shape for each type', async () => {
      const query: SearchQueryDto = { q: 'test', type: SearchType.ALL, limit: 10 };
      const result = await service.search(query, 'user-uuid-1', UserRole.ADMIN);

      const checkItem = (item: SearchResultItem, expectedType: string) => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('relevance');
        expect(item.type).toBe(expectedType);
        expect(typeof item.id).toBe('string');
        expect(typeof item.name).toBe('string');
        expect(typeof item.relevance).toBe('number');
      };

      if (result.projects.length > 0) {
        checkItem(result.projects[0], 'project');
      }
      if (result.partners.length > 0) {
        checkItem(result.partners[0], 'partner');
      }
      if (result.tasks.length > 0) {
        checkItem(result.tasks[0], 'task');
      }
    });
  });
});
