import { DataSource } from 'typeorm';
import {
  ProjectTemplate,
  TemplatePhase,
} from '../../modules/project/entities/project-template.entity';
import { ProjectType } from '../../modules/project/enums/project-type.enum';

// プリセットテンプレートデータ
const presetTemplates: Array<{
  name: string;
  description: string;
  projectType: ProjectType;
  phases: TemplatePhase[];
}> = [
  {
    name: '新規パートナー契約',
    description:
      '新規のパートナー企業との契約プロセスを管理するためのテンプレート。初期コンタクトから契約締結までの標準的なワークフローを定義しています。',
    projectType: ProjectType.DEVELOPMENT,
    phases: [
      {
        name: '初期コンタクト',
        order: 1,
        estimatedDays: 3,
        tasks: [
          { name: '担当者確認', order: 1 },
          { name: '連絡先交換', order: 2 },
          { name: '初回ヒアリング', order: 3 },
        ],
      },
      {
        name: '契約交渉',
        order: 2,
        estimatedDays: 7,
        tasks: [
          { name: '条件提示', order: 1 },
          { name: '契約書ドラフト', order: 2 },
          { name: '法務レビュー', order: 3 },
          { name: '修正対応', order: 4 },
        ],
      },
      {
        name: '契約締結',
        order: 3,
        estimatedDays: 5,
        tasks: [
          { name: '最終確認', order: 1 },
          { name: '署名手続き', order: 2 },
          { name: 'システム登録', order: 3 },
        ],
      },
    ],
  },
  {
    name: '定期レビュープロセス',
    description:
      'パートナーとの定期レビューミーティングを実施するためのテンプレート。データ収集からフォローアップまでの一連のプロセスを管理します。',
    projectType: ProjectType.MAINTENANCE,
    phases: [
      {
        name: '準備',
        order: 1,
        estimatedDays: 5,
        tasks: [
          { name: 'データ収集', order: 1 },
          { name: 'レポート作成', order: 2 },
          { name: '関係者調整', order: 3 },
        ],
      },
      {
        name: 'レビュー実施',
        order: 2,
        estimatedDays: 3,
        tasks: [
          { name: 'ミーティング設定', order: 1 },
          { name: 'レビュー実施', order: 2 },
          { name: 'フィードバック収集', order: 3 },
        ],
      },
      {
        name: 'フォローアップ',
        order: 3,
        estimatedDays: 7,
        tasks: [
          { name: 'アクションアイテム整理', order: 1 },
          { name: '改善計画策定', order: 2 },
          { name: '次回日程調整', order: 3 },
        ],
      },
    ],
  },
  {
    name: '問題対応・エスカレーション',
    description:
      'パートナーとの問題発生時のエスカレーションプロセスを管理するためのテンプレート。迅速な問題把握から再発防止策の策定までをカバーします。',
    projectType: ProjectType.SUPPORT,
    phases: [
      {
        name: '問題把握',
        order: 1,
        estimatedDays: 1,
        tasks: [
          { name: '状況確認', order: 1 },
          { name: '関係者への連絡', order: 2 },
          { name: '初期対応', order: 3 },
        ],
      },
      {
        name: '原因分析',
        order: 2,
        estimatedDays: 3,
        tasks: [
          { name: '情報収集', order: 1 },
          { name: '原因特定', order: 2 },
          { name: '影響範囲確認', order: 3 },
        ],
      },
      {
        name: '解決・再発防止',
        order: 3,
        estimatedDays: 5,
        tasks: [
          { name: '対策実施', order: 1 },
          { name: '結果報告', order: 2 },
          { name: '再発防止策策定', order: 3 },
        ],
      },
    ],
  },
];

export async function runSeed(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    entities: [ProjectTemplate],
    synchronize: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    console.log('Database connected for preset templates seed');

    const templateRepository = dataSource.getRepository(ProjectTemplate);

    for (const templateData of presetTemplates) {
      // 同名のテンプレートが既に存在するかチェック
      const existingTemplate = await templateRepository.findOne({
        where: { name: templateData.name },
      });

      if (existingTemplate) {
        console.log(`Template already exists: ${templateData.name}`);

        // 既存のテンプレートを更新
        existingTemplate.description = templateData.description;
        existingTemplate.projectType = templateData.projectType;
        existingTemplate.phases = templateData.phases;
        existingTemplate.isActive = true;

        await templateRepository.save(existingTemplate);
        console.log(`  -> Updated: ${templateData.name}`);
      } else {
        // 新規作成
        const newTemplate = templateRepository.create({
          name: templateData.name,
          description: templateData.description,
          projectType: templateData.projectType,
          phases: templateData.phases,
          isActive: true,
        });

        await templateRepository.save(newTemplate);
        console.log(`  -> Created: ${templateData.name}`);
      }
    }

    console.log('Preset templates seed completed successfully!');
  } catch (error) {
    console.error('Error running preset templates seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
  }
}

// 直接実行された場合
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log('Seed execution finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed execution failed:', error);
      process.exit(1);
    });
}
