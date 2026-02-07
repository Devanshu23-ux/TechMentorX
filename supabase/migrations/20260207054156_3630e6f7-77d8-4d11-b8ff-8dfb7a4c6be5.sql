-- ScholarGuard AI Database Schema
-- Phase 1: Foundation with complete security architecture

-- 1. Create role enum type
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Create user_roles table (stores role assignments)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- 3. Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Create departments table
CREATE TABLE public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create students table (student-specific academic data)
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    student_number TEXT UNIQUE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    gpa DECIMAL(3, 2) DEFAULT 0.00,
    is_flagged BOOLEAN DEFAULT FALSE,
    flag_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create student_scores table
CREATE TABLE public.student_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    subject TEXT NOT NULL,
    score DECIMAL(5, 2) NOT NULL,
    max_score DECIMAL(5, 2) DEFAULT 100,
    assessment_type TEXT DEFAULT 'exam',
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create student_attendance table
CREATE TABLE public.student_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (student_id, attendance_date)
);

-- 8. Create student_wellbeing table
CREATE TABLE public.student_wellbeing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 10),
    sleep_hours DECIMAL(3, 1),
    mood TEXT,
    notes TEXT,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 9. Create student_comments table (feedback/journal entries)
CREATE TABLE public.student_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    comment TEXT NOT NULL,
    comment_type TEXT DEFAULT 'feedback',
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 10. Create ai_analyses table (cached sentiment & intervention plans)
CREATE TABLE public.ai_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    analysis_type TEXT NOT NULL,
    sentiment_score INTEGER CHECK (sentiment_score >= 0 AND sentiment_score <= 100),
    mood_classification TEXT,
    detected_keywords TEXT[],
    topic_gaps TEXT[],
    intervention_plan JSONB,
    source_comment_id UUID REFERENCES public.student_comments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 11. Create teacher_assignments table (links teachers to students)
CREATE TABLE public.teacher_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (teacher_id, student_id)
);

-- ============================================
-- SECURITY DEFINER HELPER FUNCTIONS
-- ============================================

-- Check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'admin')
$$;

-- Check if current user is teacher
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'teacher')
$$;

-- Check if current user is student
CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT public.has_role(auth.uid(), 'student')
$$;

-- Get the student record for current user (if they are a student)
CREATE OR REPLACE FUNCTION public.get_current_student_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT id FROM public.students WHERE user_id = auth.uid()
$$;

-- Check if teacher is assigned to a specific student
CREATE OR REPLACE FUNCTION public.is_teacher_of_student(_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.teacher_assignments
        WHERE teacher_id = auth.uid()
          AND student_id = _student_id
    )
$$;

-- Get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- ============================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_wellbeing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES
-- ============================================

-- user_roles policies
CREATE POLICY "Admins can manage all roles" ON public.user_roles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own role" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

-- profiles policies
CREATE POLICY "Admins can manage all profiles" ON public.profiles
    FOR ALL USING (public.is_admin());

CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view assigned student profiles" ON public.profiles
    FOR SELECT USING (
        public.is_teacher() AND EXISTS (
            SELECT 1 FROM public.students s
            JOIN public.teacher_assignments ta ON ta.student_id = s.id
            WHERE s.user_id = profiles.user_id AND ta.teacher_id = auth.uid()
        )
    );

CREATE POLICY "Allow insert during signup" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- departments policies
CREATE POLICY "Everyone can view departments" ON public.departments
    FOR SELECT USING (true);

CREATE POLICY "Admins can manage departments" ON public.departments
    FOR ALL USING (public.is_admin());

-- students policies
CREATE POLICY "Admins can manage all students" ON public.students
    FOR ALL USING (public.is_admin());

CREATE POLICY "Students can view own record" ON public.students
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Teachers can view assigned students" ON public.students
    FOR SELECT USING (public.is_teacher_of_student(id));

-- student_scores policies
CREATE POLICY "Admins can manage all scores" ON public.student_scores
    FOR ALL USING (public.is_admin());

CREATE POLICY "Students can view own scores" ON public.student_scores
    FOR SELECT USING (student_id = public.get_current_student_id());

CREATE POLICY "Teachers can view assigned student scores" ON public.student_scores
    FOR SELECT USING (public.is_teacher_of_student(student_id));

CREATE POLICY "Teachers can manage assigned student scores" ON public.student_scores
    FOR INSERT WITH CHECK (public.is_teacher_of_student(student_id));

CREATE POLICY "Teachers can update assigned student scores" ON public.student_scores
    FOR UPDATE USING (public.is_teacher_of_student(student_id));

-- student_attendance policies
CREATE POLICY "Admins can manage all attendance" ON public.student_attendance
    FOR ALL USING (public.is_admin());

CREATE POLICY "Students can view own attendance" ON public.student_attendance
    FOR SELECT USING (student_id = public.get_current_student_id());

CREATE POLICY "Teachers can view assigned student attendance" ON public.student_attendance
    FOR SELECT USING (public.is_teacher_of_student(student_id));

CREATE POLICY "Teachers can manage assigned student attendance" ON public.student_attendance
    FOR INSERT WITH CHECK (public.is_teacher_of_student(student_id));

CREATE POLICY "Teachers can update assigned student attendance" ON public.student_attendance
    FOR UPDATE USING (public.is_teacher_of_student(student_id));

-- student_wellbeing policies
CREATE POLICY "Admins can manage all wellbeing" ON public.student_wellbeing
    FOR ALL USING (public.is_admin());

CREATE POLICY "Students can view own wellbeing" ON public.student_wellbeing
    FOR SELECT USING (student_id = public.get_current_student_id());

CREATE POLICY "Students can insert own wellbeing" ON public.student_wellbeing
    FOR INSERT WITH CHECK (student_id = public.get_current_student_id());

CREATE POLICY "Teachers can view assigned student wellbeing" ON public.student_wellbeing
    FOR SELECT USING (public.is_teacher_of_student(student_id));

-- student_comments policies
CREATE POLICY "Admins can manage all comments" ON public.student_comments
    FOR ALL USING (public.is_admin());

CREATE POLICY "Students can view own comments" ON public.student_comments
    FOR SELECT USING (student_id = public.get_current_student_id());

CREATE POLICY "Students can insert own comments" ON public.student_comments
    FOR INSERT WITH CHECK (student_id = public.get_current_student_id());

CREATE POLICY "Teachers can view assigned student comments" ON public.student_comments
    FOR SELECT USING (public.is_teacher_of_student(student_id));

CREATE POLICY "Teachers can insert comments for assigned students" ON public.student_comments
    FOR INSERT WITH CHECK (public.is_teacher_of_student(student_id));

-- ai_analyses policies
CREATE POLICY "Admins can manage all analyses" ON public.ai_analyses
    FOR ALL USING (public.is_admin());

CREATE POLICY "Teachers can view assigned student analyses" ON public.ai_analyses
    FOR SELECT USING (public.is_teacher_of_student(student_id));

CREATE POLICY "Students can view own analyses" ON public.ai_analyses
    FOR SELECT USING (student_id = public.get_current_student_id());

-- teacher_assignments policies
CREATE POLICY "Admins can manage all assignments" ON public.teacher_assignments
    FOR ALL USING (public.is_admin());

CREATE POLICY "Teachers can view own assignments" ON public.teacher_assignments
    FOR SELECT USING (teacher_id = auth.uid());

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Create profile automatically when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, full_name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_students_user_id ON public.students(user_id);
CREATE INDEX idx_students_department_id ON public.students(department_id);
CREATE INDEX idx_students_is_flagged ON public.students(is_flagged);
CREATE INDEX idx_student_scores_student_id ON public.student_scores(student_id);
CREATE INDEX idx_student_attendance_student_id ON public.student_attendance(student_id);
CREATE INDEX idx_student_wellbeing_student_id ON public.student_wellbeing(student_id);
CREATE INDEX idx_student_comments_student_id ON public.student_comments(student_id);
CREATE INDEX idx_ai_analyses_student_id ON public.ai_analyses(student_id);
CREATE INDEX idx_teacher_assignments_teacher_id ON public.teacher_assignments(teacher_id);
CREATE INDEX idx_teacher_assignments_student_id ON public.teacher_assignments(student_id);