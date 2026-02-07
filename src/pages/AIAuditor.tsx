import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Brain,
  AlertTriangle,
  User,
  MessageSquare,
  Sparkles,
  RefreshCw,
  BookOpen,
  Heart,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FlaggedStudent {
  _id: string; // MongoDB ID
  user: {
    fullName: string;
    email: string;
  };
  gpa: number;
  flagReason: string | null;
  profiles: { // compatibility
    full_name: string;
    email: string;
  };
  student_comments: {
    id: string;
    comment: string;
    created_at: string;
  }[];
  ai_analyses: {
    sentimentScore: number | null;
    moodClassification: string | null;
    topicGaps: string[] | null;
    interventionPlan: any;
  }[];
}

interface InterventionPlan {
  mental_health: string[];
  academic_focus: string[];
  resources: string[];
  communication_tips: string[];
}

export default function AIAuditor() {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [flaggedStudents, setFlaggedStudents] = useState<FlaggedStudent[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<FlaggedStudent | null>(null);
  const [interventionPlan, setInterventionPlan] = useState<InterventionPlan | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchFlaggedStudents();
  }, []);

  const fetchFlaggedStudents = async () => {
    try {
      const { data } = await api.get('/students'); // Fetch all, then filter. Backend could optimize this.

      const flagged = data.filter((s: any) => s.isFlagged);

      setFlaggedStudents(flagged);

      // Auto-select first student
      if (flagged.length > 0) {
        const firstStudent = flagged[0];
        setSelectedStudent(firstStudent);
        if (firstStudent.ai_analyses?.[0]?.interventionPlan) {
          setInterventionPlan(firstStudent.ai_analyses[0].interventionPlan);
        }
      }
    } catch (error) {
      console.error('Error fetching flagged students:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (student: FlaggedStudent) => {
    setSelectedStudent(student);
    setInterventionPlan(null);

    // Check for existing intervention plan
    if (student.ai_analyses?.[0]?.interventionPlan) {
      setInterventionPlan(student.ai_analyses[0].interventionPlan);
    }
  };

  const generateIntervention = async () => {
    if (!selectedStudent) return;

    setGenerating(true);
    setInterventionPlan(null);

    try {
      const { data } = await api.post('/ai/generate-intervention', {
        studentId: selectedStudent._id,
        studentName: selectedStudent.user.fullName,
        gpa: selectedStudent.gpa,
        flagReason: selectedStudent.flagReason,
        recentComment: selectedStudent.student_comments?.[0]?.comment,
        sentimentScore: selectedStudent.ai_analyses?.[0]?.sentimentScore,
        topicGaps: selectedStudent.ai_analyses?.[0]?.topicGaps,
      });

      setInterventionPlan(data.plan);

      toast({
        title: 'Intervention Generated',
        description: 'AI has created a personalized support plan.',
      });
    } catch (error: any) {
      console.error('Error generating intervention:', error);
      toast({
        title: 'Generation Failed',
        description: 'Could not generate intervention plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSentimentBadge = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { label: 'Unknown', variant: 'secondary' as const };
    if (score < 40) return { label: 'Frustrated', variant: 'destructive' as const };
    if (score < 70) return { label: 'Neutral', variant: 'secondary' as const };
    return { label: 'Motivated', variant: 'default' as const };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Brain className="h-8 w-8 text-accent" />
            AI Qualitative Auditor
          </h1>
          <p className="text-muted-foreground mt-1">
            Review flagged students and generate personalized intervention plans
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Flagged Students Sidebar */}
          <Card className="glass-card border-0 lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-alert" />
                Flagged Students
              </CardTitle>
              <CardDescription>
                {flaggedStudents.length} students need attention
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {loading ? (
                  <div className="p-4 space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : flaggedStudents.length > 0 ? (
                  <div className="p-2">
                    {flaggedStudents.map((student) => {
                      const sentiment = getSentimentBadge(student.ai_analyses?.[0]?.sentimentScore);
                      const isSelected = selectedStudent?._id === student._id;

                      return (
                        <button
                          key={student._id}
                          onClick={() => handleSelectStudent(student)}
                          className={cn(
                            'w-full p-4 rounded-xl text-left transition-all duration-200 mb-2',
                            isSelected
                              ? 'bg-accent/10 border border-accent'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                <User className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {student.user.fullName}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  GPA: {student.gpa?.toFixed(2) || 'N/A'}
                                </p>
                              </div>
                            </div>
                            <Badge variant={sentiment.variant}>{sentiment.label}</Badge>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No flagged students</p>
                    <p className="text-sm">All students are doing well!</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main Audit Area */}
          <Card className="glass-card border-0 lg:col-span-2">
            {selectedStudent ? (
              <>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selectedStudent.user.fullName}</CardTitle>
                      <CardDescription>{selectedStudent.user.email}</CardDescription>
                    </div>
                    <Badge variant={getSentimentBadge(selectedStudent.ai_analyses?.[0]?.sentimentScore).variant}>
                      {getSentimentBadge(selectedStudent.ai_analyses?.[0]?.sentimentScore).label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Student Metrics */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">GPA</p>
                      <p className="text-2xl font-bold">{selectedStudent.gpa?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">Sentiment</p>
                      <p className="text-2xl font-bold">
                        {selectedStudent.ai_analyses?.[0]?.sentimentScore || 'N/A'}%
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50">
                      <p className="text-sm text-muted-foreground">Flag Reason</p>
                      <p className="text-sm font-medium truncate">
                        {selectedStudent.flagReason || 'Not specified'}
                      </p>
                    </div>
                  </div>

                  {/* Latest Comment */}
                  {selectedStudent.student_comments?.[0] && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        Latest Comment
                      </h4>
                      <blockquote className="border-l-4 border-accent pl-4 py-2 italic text-foreground bg-muted/30 rounded-r-lg">
                        "{selectedStudent.student_comments[0].comment}"
                      </blockquote>
                    </div>
                  )}

                  {/* Topic Gaps */}
                  {selectedStudent.ai_analyses?.[0]?.topicGaps && selectedStudent.ai_analyses[0].topicGaps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                        Identified Learning Gaps
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedStudent.ai_analyses[0].topicGaps.map((gap, i) => (
                          <Badge key={i} variant="outline" className="bg-warning/10">
                            {gap}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Intervention Button */}
                  <Button
                    onClick={generateIntervention}
                    disabled={generating}
                    className="w-full"
                    size="lg"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Generating Intervention...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-4 w-4" />
                        Generate Intervention Plan
                      </>
                    )}
                  </Button>

                  {/* Intervention Plan */}
                  {generating && (
                    <div className="space-y-4">
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  )}

                  {interventionPlan && !generating && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-accent" />
                        AI-Generated Support Plan
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-success/10 border border-success/20">
                          <h4 className="font-medium flex items-center gap-2 text-success mb-2">
                            <Heart className="h-4 w-4" />
                            Mental Health
                          </h4>
                          <ul className="text-sm space-y-1">
                            {interventionPlan.mental_health?.map((item, i) => (
                              <li key={i} className="text-muted-foreground">• {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
                          <h4 className="font-medium flex items-center gap-2 text-accent mb-2">
                            <Target className="h-4 w-4" />
                            Academic Focus
                          </h4>
                          <ul className="text-sm space-y-1">
                            {interventionPlan.academic_focus?.map((item, i) => (
                              <li key={i} className="text-muted-foreground">• {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                          <h4 className="font-medium flex items-center gap-2 text-primary mb-2">
                            <BookOpen className="h-4 w-4" />
                            Resources
                          </h4>
                          <ul className="text-sm space-y-1">
                            {interventionPlan.resources?.map((item, i) => (
                              <li key={i} className="text-muted-foreground">• {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                          <h4 className="font-medium flex items-center gap-2 text-warning mb-2">
                            <MessageSquare className="h-4 w-4" />
                            Communication Tips
                          </h4>
                          <ul className="text-sm space-y-1">
                            {interventionPlan.communication_tips?.map((item, i) => (
                              <li key={i} className="text-muted-foreground">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex items-center justify-center h-[500px] text-muted-foreground">
                <div className="text-center">
                  <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium">Select a Student</p>
                  <p className="text-sm">Choose a flagged student to review their data</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout >
  );
}
