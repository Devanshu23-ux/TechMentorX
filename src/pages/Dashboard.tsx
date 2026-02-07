import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api'; // Changed import
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  Brain,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  Activity,
} from 'lucide-react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface KPIData {
  totalStudents: number;
  avgSentiment: number;
  highRiskAlerts: number;
  engagementRate: number;
}

interface ScatterDataPoint {
  name: string;
  totalScore: number;
  stressLevel: number;
  sentiment: 'frustrated' | 'neutral' | 'motivated';
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState<KPIData>({
    totalStudents: 0,
    avgSentiment: 0,
    highRiskAlerts: 0,
    engagementRate: 0,
  });
  const [scatterData, setScatterData] = useState<ScatterDataPoint[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Use new API endpoint
      const { data } = await api.get('/students/dashboard');

      setKpiData(data.kpiData);
      setScatterData(data.scatterData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'frustrated':
        return 'hsl(0, 84%, 60%)';
      case 'motivated':
        return 'hsl(142, 71%, 45%)';
      default:
        return 'hsl(217, 91%, 60%)';
    }
  };

  const kpiCards = [
    {
      title: 'Total Students',
      value: kpiData.totalStudents,
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'bg-primary',
    },
    {
      title: 'Avg. Sentiment',
      value: `${kpiData.avgSentiment}%`,
      icon: Brain,
      trend: '+5%',
      trendUp: true,
      color: 'bg-accent',
    },
    {
      title: 'High-Risk Alerts',
      value: kpiData.highRiskAlerts,
      icon: AlertTriangle,
      trend: kpiData.highRiskAlerts > 0 ? 'Attention needed' : 'All clear',
      trendUp: kpiData.highRiskAlerts === 0,
      color: 'bg-alert',
      glow: kpiData.highRiskAlerts > 0,
    },
    {
      title: 'Engagement Rate',
      value: `${kpiData.engagementRate}%`,
      icon: TrendingUp,
      trend: '+3%',
      trendUp: true,
      color: 'bg-success',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Real-time learning intelligence overview
          </p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiCards.map((card) => (
            <Card
              key={card.title}
              className={`glass-card border-0 transition-all duration-300 hover:scale-[1.02] ${card.glow ? 'animate-pulse-glow' : ''
                }`}
            >
              <CardContent className="p-6">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <Skeleton className="h-8 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ) : (
                  <>
                    <div
                      className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-4`}
                    >
                      <card.icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-3xl font-bold text-foreground">{card.value}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">{card.title}</span>
                      <Badge
                        variant={card.trendUp ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {card.trend}
                      </Badge>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance vs. Well-being Scatter Plot */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-accent" />
                Performance vs. Well-being
              </CardTitle>
              <CardDescription>
                Correlation between academic scores and stress levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : scatterData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      type="number"
                      dataKey="totalScore"
                      name="Performance"
                      unit="%"
                      domain={[0, 100]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      type="number"
                      dataKey="stressLevel"
                      name="Stress"
                      domain={[1, 10]}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload as ScatterDataPoint;
                          return (
                            <div className="glass-card p-3 rounded-lg shadow-lg">
                              <p className="font-semibold text-foreground">{data.name}</p>
                              <p className="text-sm text-muted-foreground">
                                Performance: {data.totalScore}%
                              </p>
                              <p className="text-sm text-muted-foreground">
                                Stress Level: {data.stressLevel}/10
                              </p>
                              <Badge
                                className="mt-2"
                                style={{ backgroundColor: getSentimentColor(data.sentiment) }}
                              >
                                {data.sentiment}
                              </Badge>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getSentimentColor(entry.sentiment)}
                          fillOpacity={0.8}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No student data available yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and navigation shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => navigate('/auditor')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                    <Brain className="h-5 w-5 text-accent" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">AI Qualitative Auditor</p>
                    <p className="text-sm text-muted-foreground">
                      Review flagged students and generate interventions
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>

              <Button
                variant="outline"
                className="w-full justify-between h-auto py-4"
                onClick={() => navigate('/students')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Student Insights Explorer</p>
                    <p className="text-sm text-muted-foreground">
                      Browse and analyze student data
                    </p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground" />
              </Button>

              {kpiData.highRiskAlerts > 0 && (
                <Button
                  variant="destructive"
                  className="w-full justify-between h-auto py-4"
                  onClick={() => navigate('/auditor')}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">
                        {kpiData.highRiskAlerts} Students Need Attention
                      </p>
                      <p className="text-sm opacity-80">Review flagged students now</p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
