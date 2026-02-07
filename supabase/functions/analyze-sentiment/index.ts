import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AnalyzeRequest {
  commentId: string;
  studentId: string;
  comment: string;
}

// Keywords that indicate potential struggle
const concernKeywords = [
  "struggle", "struggling", "confused", "confusing", "fail", "failing", "failed",
  "lost", "overwhelmed", "stressed", "stress", "anxious", "anxiety", "depressed",
  "depression", "hate", "quit", "give up", "can't", "cannot", "impossible",
  "hopeless", "frustrated", "frustrating", "difficult", "hard", "don't understand"
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body: AnalyzeRequest = await req.json();
    const { commentId, studentId, comment } = body;

    console.log("Analyzing comment for student:", studentId);

    // Check for concern keywords (early detection)
    const lowerComment = comment.toLowerCase();
    const detectedKeywords = concernKeywords.filter(keyword => 
      lowerComment.includes(keyword)
    );

    const systemPrompt = `You are an expert at analyzing student feedback and comments to understand their emotional state, learning struggles, and topic gaps.

Analyze the student comment and respond with a valid JSON object:
{
  "sentiment_score": <number 0-100, where 0=very negative, 50=neutral, 100=very positive>,
  "mood_classification": "<one of: frustrated, anxious, neutral, content, motivated>",
  "detected_keywords": ["keyword1", "keyword2"],
  "topic_gaps": ["topic1", "topic2"],
  "should_flag": <boolean - true if student needs immediate attention>
}

Be thorough but concise. Focus on actionable insights.`;

    const userPrompt = `Analyze this student comment:

"${comment}"

Identify:
1. The overall sentiment (0-100 score)
2. The emotional mood classification
3. Any concerning keywords or phrases
4. Potential topic/subject gaps they're struggling with
5. Whether this student should be flagged for teacher attention

Respond ONLY with the JSON object.`;

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
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback analysis based on keyword detection
      const hasKeywords = detectedKeywords.length > 0;
      analysis = {
        sentiment_score: hasKeywords ? 35 : 50,
        mood_classification: hasKeywords ? "frustrated" : "neutral",
        detected_keywords: detectedKeywords,
        topic_gaps: [],
        should_flag: hasKeywords
      };
    }

    // Combine AI analysis with keyword detection
    const allKeywords = [...new Set([...analysis.detected_keywords || [], ...detectedKeywords])];
    const shouldFlag = analysis.should_flag || detectedKeywords.length > 0;

    // Save analysis to database
    const { error: insertError } = await supabase
      .from("ai_analyses")
      .insert({
        student_id: studentId,
        analysis_type: "sentiment",
        sentiment_score: analysis.sentiment_score,
        mood_classification: analysis.mood_classification,
        detected_keywords: allKeywords,
        topic_gaps: analysis.topic_gaps || [],
        source_comment_id: commentId,
      });

    if (insertError) {
      console.error("Error saving analysis:", insertError);
    }

    // Flag student if necessary
    if (shouldFlag) {
      const flagReason = allKeywords.length > 0 
        ? `Detected concern keywords: ${allKeywords.slice(0, 3).join(", ")}`
        : `Low sentiment score: ${analysis.sentiment_score}%`;

      const { error: flagError } = await supabase
        .from("students")
        .update({ is_flagged: true, flag_reason: flagReason })
        .eq("id", studentId);

      if (flagError) {
        console.error("Error flagging student:", flagError);
      }
    }

    console.log("Analysis complete:", analysis);

    return new Response(
      JSON.stringify({
        sentiment_score: analysis.sentiment_score,
        mood_classification: analysis.mood_classification,
        detected_keywords: allKeywords,
        topic_gaps: analysis.topic_gaps || [],
        should_flag: shouldFlag
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error analyzing comment:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
