import {
  FolderKanban,
  CheckSquare,
  FileText,
  Clock,
  AlertTriangle,
  Smile,
  XCircle,
  Calendar,
} from 'lucide-react';
import { Card, Badge } from '@/components/common';
import {
  DashboardData,
  statusLabels,
  taskStatusLabels,
  progressStatusLabels,
} from './types';

interface DashboardContentProps {
  data: DashboardData;
}

export function DashboardContent({ data }: DashboardContentProps) {
  const { stats, projects, upcomingTasks, recentReports } = data;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid-stats">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderKanban className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">担当案件</p>
              <p className="text-2xl font-bold text-gray-900">{stats.projects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckSquare className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">タスク</p>
              <p className="text-2xl font-bold text-gray-900">
                {stats.tasks.completed}/{stats.tasks.total}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">今月の報告</p>
              <p className="text-2xl font-bold text-gray-900">{stats.reportsThisMonth}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${stats.tasks.overdue > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
              <AlertTriangle className={`h-5 w-5 ${stats.tasks.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">期限超過</p>
              <p className={`text-2xl font-bold ${stats.tasks.overdue > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {stats.tasks.overdue}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Projects */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">担当案件</h2>
            <FolderKanban className="h-5 w-5 text-gray-400" />
          </div>
          {projects.length === 0 ? (
            <p className="text-gray-500 text-center py-8">担当案件はありません</p>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => (
                <div key={project.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      {project.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                      )}
                      {(project.startDate || project.endDate) && (
                        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {project.startDate && new Date(project.startDate).toLocaleDateString('ja-JP')}
                          {project.startDate && project.endDate && ' 〜 '}
                          {project.endDate && new Date(project.endDate).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>
                    <Badge
                      variant={
                        project.status === 'completed' ? 'success' :
                        project.status === 'in_progress' ? 'primary' :
                        project.status === 'on_hold' ? 'warning' : 'default'
                      }
                    >
                      {statusLabels[project.status] || project.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Tasks */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">今週のタスク</h2>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
          {upcomingTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">今週のタスクはありません</p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <div key={task.id} className="p-4 rounded-lg border border-gray-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                      {task.projectName && (
                        <p className="text-sm text-gray-500">{task.projectName}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          task.status === 'done' ? 'success' :
                          task.status === 'in_progress' ? 'primary' : 'default'
                        }
                        size="sm"
                      >
                        {taskStatusLabels[task.status] || task.status}
                      </Badge>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500">
                          {new Date(task.dueDate).toLocaleDateString('ja-JP')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent Reports */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">最近の報告</h2>
          <FileText className="h-5 w-5 text-gray-400" />
        </div>
        {recentReports.length === 0 ? (
          <p className="text-gray-500 text-center py-8">報告履歴はありません</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left text-sm font-medium text-gray-500 py-3 pr-4">日時</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3 pr-4">ステータス</th>
                  <th className="text-left text-sm font-medium text-gray-500 py-3">案件</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((report) => (
                  <tr key={report.id} className="border-b border-gray-100 last:border-0">
                    <td className="py-3 pr-4 text-sm text-gray-600">
                      {new Date(report.createdAt).toLocaleString('ja-JP', {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3 pr-4">
                      {report.reportType === 'completion' ? (
                        <Badge variant="success" size="sm">完了</Badge>
                      ) : report.progressStatus ? (
                        <span className={`inline-flex items-center gap-1 text-sm ${
                          report.progressStatus === 'on_track' ? 'text-green-600' :
                          report.progressStatus === 'slightly_delayed' ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {report.progressStatus === 'on_track' ? <Smile className="h-4 w-4" /> :
                           report.progressStatus === 'slightly_delayed' ? <AlertTriangle className="h-4 w-4" /> :
                           <XCircle className="h-4 w-4" />}
                          {progressStatusLabels[report.progressStatus]?.label || report.progressStatus}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-3 text-sm text-gray-600">
                      {report.projectName || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
