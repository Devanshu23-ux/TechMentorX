import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InterventionRequest {
  studentId: string;
  studentName: string;
  gpa: number;
  flagReason: string | null;
  recentComment: string | null;
  sentimentScore: number | null;
  topicGaps: string[] | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: InterventionRequest = await req.json();
    const { studentName, gpa, flagReason, recentComment, sentimentScore, topicGaps } = body;

    console.log("Generating intervention for student:", studentName);

    const systemPrompt = `You are an expert educational psychologist and academic advisor. Your role is to analyze student data and generate personalized intervention plans that address both academic and emotional well-being needs.

You must respond with a valid JSON object containing exactly these four arrays:
{
  "mental_health": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "academic_focus": ["focus area 1", "focus area 2", "focus area 3"],
  "resources": ["resource 1", "resource 2", "resource 3"],
  "communication_tips": ["tip 1", "tip 2", "tip 3"]
}

Each array should contain 3-5 specific, actionable items tailored to the student's situation.`;

    const userPrompt = `Generate a personalized intervention plan for this student:

**Student Profile:**
- Name: ${studentName}
- Current GPA: ${gpa?.toFixed(2) || "N/A"}
- Flag Reason: ${flagReason || "Not specified"}
- Sentiment Score: ${sentimentScore || "Unknown"}%
- Identified Learning Gaps: ${topicGaps?.join(", ") || "None identified"}

**Recent Comment from Student:**
"${recentComment || "No recent comments available"}"

Based on this information, create a comprehensive support plan with:
1. Mental health recommendations (stress management, emotional support)
2. Academic focus areas (specific subjects or skills to improve)
3. Suggested resources (tools, websites, study materials)
4. Communication tips for teachers (how to approach and support this student)

Respond ONLY with the JSON object, no additional text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI response content:", content);

    // Parse the JSON response
    let plan;
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Provide a fallback plan
      plan = {
        mental_health: [
          "Schedule regular check-ins with school counselor",
          "Practice mindfulness exercises for 10 minutes daily",
          "Establish a consistent sleep schedule"
        ],
        academic_focus: [
          "Review foundational concepts in challenging subjects",
          "Create a structured study schedule",
          "Seek tutoring support for identified weak areas"
        ],
        resources: [
          "Khan Academy for supplementary learning",
          "Quizlet for vocabulary and concept review",
          "School library study rooms for focused work"
        ],
        communication_tips: [
          "Start conversations with genuine interest in their well-being",
          "Provide specific, actionable feedback on assignments",
          "Celebrate small wins to build confidence"
        ]
      };
    }

    console.log("Generated intervention plan:", plan);

    return new Response(
      JSON.stringify({ plan }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating intervention:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
