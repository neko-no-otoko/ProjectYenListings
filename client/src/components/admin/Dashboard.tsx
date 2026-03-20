import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  RefreshCw,
  Database,
  Home,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  MapPin,
  BarChart3,
  Play,
  AlertTriangle,
  XCircle,
  Calendar,
  Layers,
} from "lucide-react";

// Types
interface SyncStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalRecordsFetched: number;
  totalRecordsUpserted: number;
  totalRecordsSkipped: number;
  averageRecordsPerSync: number;
  errorRate: number;
}

interface DailyMetrics {
  date: string;
  syncs: number;
  recordsFetched: number;
  recordsUpserted: number;
  recordsSkipped: number;
  errors: number;
}

interface DataSourceCoverage {
  totalDatasets: number;
  activeDatasets: number;
  reviewRequired: number;
  denied: number;
  inactive: number;
  datasetsWithResources: number;
  lastIndexedAt: string | null;
}

interface PropertyImportStats {
  totalVariants: number;
  activeVariants: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byPrefecture: Record<string, number>;
}

interface IngestionLog {
  id: string;
  connectorName: string;
  jobType: string;
  startedAt: string;
  completedAt: string | null;
  status: "running" | "completed" | "completed_with_errors" | "failed";
  itemsFetched: number;
  itemsUpserted: number;
  itemsSkipped: number;
  errorMessage: string | null;
  metadata: any;
}

interface SystemHealth {
  status: "healthy" | "degraded" | "error";
  message: string;
  lastSuccessfulSync: string | null;
}

interface DashboardData {
  lastSync: IngestionLog | null;
  last24Hours: SyncStats;
  last7Days: SyncStats;
  last30Days: SyncStats;
  dailyMetrics: DailyMetrics[];
  dataSourceCoverage: DataSourceCoverage;
  propertyImportStats: PropertyImportStats;
  recentSyncs: IngestionLog[];
  systemHealth: SystemHealth;
}

// Helper functions
function formatNumber(num: number): string {
  return num.toLocaleString();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "N/A";
  return new Date(dateStr).toLocaleString();
}

function getTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return "Just now";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    case "completed_with_errors":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          With Errors
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </Badge>
      );
    case "running":
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getHealthBadge(status: SystemHealth["status"]) {
  switch (status) {
    case "healthy":
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Healthy
        </Badge>
      );
    case "degraded":
      return (
        <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Degraded
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <AlertCircle className="w-3 h-3 mr-1" />
          Error
        </Badge>
      );
  }
}

// Components
function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendUp,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className={`flex items-center text-xs mt-1 ${trendUp ? "text-green-600" : "text-red-600"}`}>
            {trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SyncStatsSection({ stats, period }: { stats: SyncStats; period: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Syncs"
        value={formatNumber(stats.totalSyncs)}
        description={`Over ${period}`}
        icon={RefreshCw}
      />
      <StatCard
        title="Records Fetched"
        value={formatNumber(stats.totalRecordsFetched)}
        description={`${formatNumber(stats.averageRecordsPerSync)} avg per sync`}
        icon={Database}
      />
      <StatCard
        title="Records Upserted"
        value={formatNumber(stats.totalRecordsUpserted)}
        description="Successfully imported"
        icon={Layers}
      />
      <StatCard
        title="Error Rate"
        value={`${stats.errorRate.toFixed(1)}%`}
        description={`${formatNumber(stats.failedSyncs)} failed syncs`}
        icon={stats.errorRate > 20 ? AlertCircle : CheckCircle}
        trend={stats.errorRate < 10 ? "Good" : "Needs attention"}
        trendUp={stats.errorRate < 10}
      />
    </div>
  );
}

function DailyMetricsChart({ metrics }: { metrics: DailyMetrics[] }) {
  const maxRecords = Math.max(...metrics.map((m) => m.recordsUpserted), 1);

  return (
    <div className="space-y-2">
      {metrics.map((day) => {
        const percentage = (day.recordsUpserted / maxRecords) * 100;
        return (
          <div key={day.date} className="flex items-center gap-4">
            <div className="w-24 text-sm text-muted-foreground">
              {new Date(day.date).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <div className="flex-1">
              <div className="h-8 bg-muted rounded-md overflow-hidden relative">
                <div
                  className={`h-full transition-all duration-500 ${
                    day.errors > 0 ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.max(percentage, 2)}%` }}
                />
                <div className="absolute inset-0 flex items-center px-2">
                  <span className="text-xs font-medium">
                    {formatNumber(day.recordsUpserted)} imported
                    {day.errors > 0 && ` (${day.errors} errors)`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SyncHistoryTable({ logs }: { logs: IngestionLog[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Started</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Records</TableHead>
          <TableHead>Result</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => {
          const duration = log.completedAt
            ? Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
            : null;

          return (
            <TableRow key={log.id}>
              <TableCell className="text-sm">
                <div>{formatDate(log.startedAt)}</div>
                <div className="text-muted-foreground">{getTimeAgo(log.startedAt)}</div>
              </TableCell>
              <TableCell>{getStatusBadge(log.status)}</TableCell>
              <TableCell>
                {duration !== null ? `${duration}s` : <RefreshCw className="w-4 h-4 animate-spin" />}
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>Fetched: {formatNumber(log.itemsFetched)}</div>
                  <div className="text-green-600">Upserted: {formatNumber(log.itemsUpserted)}</div>
                  {log.itemsSkipped > 0 && <div className="text-muted-foreground">Skipped: {formatNumber(log.itemsSkipped)}</div>}
                </div>
              </TableCell>
              <TableCell>
                {log.errorMessage ? (
                  <div className="text-sm text-red-600 max-w-xs truncate" title={log.errorMessage}>
                    {log.errorMessage}
                  </div>
                ) : (
                  <span className="text-sm text-green-600">Success</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

function CoverageCard({ coverage }: { coverage: DataSourceCoverage }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Data Source Coverage
        </CardTitle>
        <CardDescription>BODIK dataset indexing status</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatNumber(coverage.totalDatasets)}</div>
            <div className="text-sm text-muted-foreground">Total Datasets</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-green-600">{formatNumber(coverage.activeDatasets)}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-yellow-600">{formatNumber(coverage.reviewRequired)}</div>
            <div className="text-sm text-muted-foreground">Review Required</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold text-blue-600">{formatNumber(coverage.datasetsWithResources)}</div>
            <div className="text-sm text-muted-foreground">With Resources</div>
          </div>
        </div>
        <Separator />
        <div className="text-sm text-muted-foreground">
          Last indexed: {getTimeAgo(coverage.lastIndexedAt)}
        </div>
      </CardContent>
    </Card>
  );
}

function PropertyStatsCard({ stats }: { stats: PropertyImportStats }) {
  const prefectures = Object.entries(stats.byPrefecture)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Home className="w-5 h-5" />
          Property Imports
        </CardTitle>
        <CardDescription>BODIK property import statistics</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatNumber(stats.today)}</div>
            <div className="text-sm text-muted-foreground">Today</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatNumber(stats.thisWeek)}</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl font-bold">{formatNumber(stats.thisMonth)}</div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </div>
        </div>
        <Separator />
        <div className="space-y-2">
          <div className="text-sm font-medium">Top Prefectures</div>
          {prefectures.length > 0 ? (
            prefectures.map(([prefecture, count]) => (
              <div key={prefecture} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="w-3 h-3 text-muted-foreground" />
                  {prefecture}
                </span>
                <span className="font-medium">{formatNumber(count)}</span>
              </div>
            ))
          ) : (
            <div className="text-sm text-muted-foreground">No data available</div>
          )}
        </div>
        <Separator />
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total Variants</span>
          <span className="font-medium">{formatNumber(stats.totalVariants)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Active</span>
          <span className="font-medium text-green-600">{formatNumber(stats.activeVariants)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

// Main Dashboard Component
export default function BODIKDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch dashboard data
  const { data, isLoading, error, refetch } = useQuery<{ data: DashboardData }>({
    queryKey: ["/api/admin/bodik/dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/bodik/dashboard");
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Manual sync mutation
  const syncMutation = useMutation({
    mutationFn: async (config: { maxDatasets?: number; dryRun?: boolean }) => {
      const res = await apiRequest("POST", "/api/admin/bodik/sync/trigger", config);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sync Triggered",
        description: "The BODIK sync has been started in the background.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/bodik/dashboard"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="w-5 h-5" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription className="text-red-700">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboard = data?.data;

  if (!dashboard) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>The dashboard data is not available at this time.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">BODIK Sync Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor and manage the BODIK data ingestion pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          {getHealthBadge(dashboard.systemHealth.status)}
          <Button
            onClick={() => syncMutation.mutate({ maxDatasets: 50 })}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Trigger Sync
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Last Sync Info */}
      {dashboard.lastSync && (
        <Card className="bg-muted/50">
          <CardContent className="py-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Last sync:</span>
                <span className="font-medium">{getTimeAgo(dashboard.lastSync.startedAt)}</span>
              </div>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <div className="flex items-center gap-2">
                {getStatusBadge(dashboard.lastSync.status)}
              </div>
              <Separator orientation="vertical" className="h-4 hidden sm:block" />
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Records:</span>
                <span className="font-medium">
                  {formatNumber(dashboard.lastSync.itemsFetched)} fetched,{" "}
                  {formatNumber(dashboard.lastSync.itemsUpserted)} imported
                </span>
              </div>
              {dashboard.systemHealth.message && (
                <>
                  <Separator orientation="vertical" className="h-4 hidden sm:block" />
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span className={
                      dashboard.systemHealth.status === "healthy" ? "text-green-600" :
                      dashboard.systemHealth.status === "degraded" ? "text-yellow-600" : "text-red-600"
                    }>
                      {dashboard.systemHealth.message}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stats">Statistics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="coverage">Coverage</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <SyncStatsSection stats={dashboard.last7Days} period="last 7 days" />
          
          <div className="grid gap-6 md:grid-cols-2">
            <CoverageCard coverage={dashboard.dataSourceCoverage} />
            <PropertyStatsCard stats={dashboard.propertyImportStats} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Last 7 Days Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DailyMetricsChart metrics={dashboard.dailyMetrics} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Statistics Tab */}
        <TabsContent value="stats" className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Last 24 Hours</h3>
            <SyncStatsSection stats={dashboard.last24Hours} period="last 24 hours" />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Last 7 Days</h3>
            <SyncStatsSection stats={dashboard.last7Days} period="last 7 days" />
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Last 30 Days</h3>
            <SyncStatsSection stats={dashboard.last30Days} period="last 30 days" />
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Sync History
              </CardTitle>
              <CardDescription>
                Showing the last {dashboard.recentSyncs.length} sync operations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <SyncHistoryTable logs={dashboard.recentSyncs} />
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Coverage Tab */}
        <TabsContent value="coverage" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <CoverageCard coverage={dashboard.dataSourceCoverage} />
            <PropertyStatsCard stats={dashboard.propertyImportStats} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dataset Status Breakdown</CardTitle>
              <CardDescription>Overview of all indexed BODIK datasets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Active</span>
                  </div>
                  <span className="text-lg font-bold text-green-600">
                    {formatNumber(dashboard.dataSourceCoverage.activeDatasets)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium">Review Required</span>
                  </div>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatNumber(dashboard.dataSourceCoverage.reviewRequired)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium">Denied</span>
                  </div>
                  <span className="text-lg font-bold text-red-600">
                    {formatNumber(dashboard.dataSourceCoverage.denied)}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-gray-600" />
                    <span className="font-medium">Inactive</span>
                  </div>
                  <span className="text-lg font-bold text-gray-600">
                    {formatNumber(dashboard.dataSourceCoverage.inactive)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
