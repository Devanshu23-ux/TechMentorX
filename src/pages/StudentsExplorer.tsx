import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Users,
  Search,
  Filter,
  User,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';

interface Student {
  _id: string; // Changed from id to _id for MongoDB
  gpa: number;
  isFlagged: boolean; // Changed case
  enrollmentDate: string; // Changed case
  department: string;
  user: {
    fullName: string;
    email: string;
  };
  profiles: { // Kept for compatibility if backend maps it
    fullName: string;
    email: string;
  };
  student_comments: {
    comment: string;
  }[];
  ai_analyses: {
    sentimentScore: number | null; // Changed case
    moodClassification: string | null; // Changed case
  }[];
}

interface SkillData {
  subject: string;
  score: number;
  fullMark: number;
}

export default function StudentsExplorer() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [skillData, setSkillData] = useState<SkillData[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [students, searchQuery, sentimentFilter]);

  const fetchStudents = async () => {
    try {
      const { data } = await api.get('/students');
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let result = [...students];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.user?.fullName.toLowerCase().includes(query) ||
          s.user?.email.toLowerCase().includes(query) ||
          s.department?.toLowerCase().includes(query)
      );
    }

    // Sentiment filter
    if (sentimentFilter !== 'all') {
      result = result.filter((s) => {
        const score = s.ai_analyses?.[0]?.sentimentScore;
        if (sentimentFilter === 'frustrated') return score !== null && score !== undefined && score < 40;
        if (sentimentFilter === 'neutral') return score !== null && score !== undefined && score >= 40 && score < 70;
        if (sentimentFilter === 'motivated') return score !== null && score !== undefined && score >= 70;
        return true;
      });
    }

    setFilteredStudents(result);
  };

  const handleStudentClick = async (student: Student) => {
    setSelectedStudent(student);
    setModalOpen(true);

    // Fetch skill data (scores by subject)
    try {
      const { data } = await api.get(`/students/${student._id}`);

      if (data && data.student_scores) {
        // Aggregate scores by subject
        const subjectScores: Record<string, { total: number; count: number; max: number }> = {};
        data.student_scores.forEach((score: any) => {
          if (!subjectScores[score.subject]) {
            subjectScores[score.subject] = { total: 0, count: 0, max: score.maxScore || 100 };
          }
          subjectScores[score.subject].total += score.score;
          subjectScores[score.subject].count += 1;
        });

        const radarData: SkillData[] = Object.entries(subjectScores).map(([subject, data]) => ({
          subject,
          score: Math.round((data.total / data.count / data.max) * 100),
          fullMark: 100,
        }));

        setSkillData(radarData);
      }
    } catch (error) {
      console.error('Error fetching skill data:', error);
    }
  };

  const getSentimentBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { label: 'Unknown', variant: 'secondary' as const, color: 'bg-muted' };
    if (score < 40) return { label: 'Frustrated', variant: 'destructive' as const, color: 'bg-destructive' };
    if (score < 70) return { label: 'Neutral', variant: 'secondary' as const, color: 'bg-muted' };
    return { label: 'Motivated', variant: 'default' as const, color: 'bg-success' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Users className="h-8 w-8 text-primary" />
            Student Insights Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse, search, and analyze student data
          </p>
        </div>

        {/* Filters */}
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by sentiment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sentiments</SelectItem>
                  <SelectItem value="frustrated">Frustrated</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="motivated">Motivated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>
              {filteredStudents.length} of {students.length} students
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredStudents.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>GPA</TableHead>
                      <TableHead>Sentiment</TableHead>
                      <TableHead>Latest Comment</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.map((student) => {
                      const sentiment = getSentimentBadge(student.ai_analyses?.[0]?.sentimentScore);
                      const latestComment = student.student_comments?.[0]?.comment;

                      return (
                        <TableRow
                          key={student._id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleStudentClick(student)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{student.user?.fullName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {student.user?.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{student.department || 'N/A'}</TableCell>
                          <TableCell>
                            <span className="font-mono font-medium">
                              {student.gpa?.toFixed(2) || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <p className="text-sm text-muted-foreground truncate">
                              {latestComment || 'No comments'}
                            </p>
                          </TableCell>
                          <TableCell>
                            {student.isFlagged && (
                              <Badge variant="destructive" className="animate-pulse">
                                Flagged
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students found</p>
                <p className="text-sm">Try adjusting your search or filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Detail Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          {selectedStudent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p>{selectedStudent.user?.fullName}</p>
                    <p className="text-sm font-normal text-muted-foreground">
                      {selectedStudent.user?.email}
                    </p>
                  </div>
                </DialogTitle>
                <DialogDescription>
                  {selectedStudent.department || 'No department'} • Enrolled{' '}
                  {selectedStudent.enrollmentDate
                    ? new Date(selectedStudent.enrollmentDate).toLocaleDateString()
                    : 'N/A'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <TrendingUp className="h-5 w-5 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{selectedStudent.gpa?.toFixed(2) || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">GPA</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Calendar className="h-5 w-5 mx-auto mb-2 text-accent" />
                    <p className="text-2xl font-bold">
                      {selectedStudent.ai_analyses?.[0]?.sentimentScore || 'N/A'}%
                    </p>
                    <p className="text-sm text-muted-foreground">Sentiment</p>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50 text-center">
                    <Badge
                      variant={getSentimentBadge(selectedStudent.ai_analyses?.[0]?.sentimentScore).variant}
                      className="mb-2"
                    >
                      {getSentimentBadge(selectedStudent.ai_analyses?.[0]?.sentimentScore).label}
                    </Badge>
                    <p className="text-sm text-muted-foreground">Mood</p>
                  </div>
                </div>

                {/* Skill Development Radar */}
                {skillData.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-4">Skill Development</h4>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={skillData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis
                          dataKey="subject"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <PolarRadiusAxis
                          angle={30}
                          domain={[0, 100]}
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Radar
                          name="Score"
                          dataKey="score"
                          stroke="hsl(var(--accent))"
                          fill="hsl(var(--accent))"
                          fillOpacity={0.5}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Latest Comment */}
                {selectedStudent.student_comments?.[0] && (
                  <div>
                    <h4 className="font-medium mb-2">Latest Comment</h4>
                    <blockquote className="border-l-4 border-accent pl-4 py-2 italic text-muted-foreground bg-muted/30 rounded-r-lg">
                      "{selectedStudent.student_comments[0].comment}"
                    </blockquote>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
