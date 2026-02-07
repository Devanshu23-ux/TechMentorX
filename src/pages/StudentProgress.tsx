import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  GraduationCap,
  Calendar,
  Heart,
  TrendingUp,
  BookOpen,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface StudentData {
  gpa: number;
  attendanceRate: number;
  latestMood: string;
  latestFeedback: string;
}

interface PerformanceTrend {
  date: string;
  score: number;
}

export default function StudentProgress() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [performanceTrend, setPerformanceTrend] = useState<PerformanceTrend[]>([]);

  useEffect(() => {
    if (user) {
      fetchStudentData();
    }
  }, [user]);

  const fetchStudentData = async () => {
    try {
      const { data } = await api.get('/students/me');

      const { student, attendance, latestWellbeing, latestAnalysis, scores } = data;

      // Calculate attendance rate
      const presentCount = attendance?.filter((a: any) => a.status === 'present').length || 0;
      const attendanceRate = attendance?.length
        ? Math.round((presentCount / attendance.length) * 100)
        : 0;

      setStudentData({
        gpa: student.gpa || 0,
        attendanceRate,
        latestMood: latestWellbeing?.mood || 'Not recorded',
        latestFeedback: latestAnalysis?.moodClassification || 'No feedback yet',
      });

      if (scores) {
        const trends = scores.map((s: any) => ({
          date: new Date(s.assessmentDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
          score: Math.round((s.score / (s.maxScore || 100)) * 100),
        }));
        setPerformanceTrend(trends);
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Current GPA',
      value: studentData?.gpa.toFixed(2) || '0.00',
      icon: GraduationCap,
      color: 'bg-primary',
    },
    {
      title: 'Attendance Rate',
      value: `${studentData?.attendanceRate || 0}%`,
      icon: Calendar,
      color: 'bg-success',
    },
    {
      title: 'Current Mood',
      value: studentData?.latestMood || 'Not recorded',
      icon: Heart,
      color: 'bg-accent',
    },
    {
      title: 'AI Feedback',
      value: studentData?.latestFeedback || 'Pending',
      icon: BookOpen,
      color: 'bg-warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Progress</h1>
          <p className="text-muted-foreground mt-1">
            Track your academic journey and well-being
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <Card key={card.title} className="glass-card border-0">
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
                    <div className="text-2xl font-bold text-foreground truncate">
                      {card.value}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{card.title}</p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Performance Trend */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Performance Trend
            </CardTitle>
            <CardDescription>Your assessment scores over time</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : performanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="hsl(var(--accent))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--accent))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No assessment data available yet
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
