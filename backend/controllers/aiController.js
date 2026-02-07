const { AiAnalysis } = require('../models/StudentData');

// @desc    Generate Intervention Plan
// @route   POST /api/ai/generate-intervention
// @access  Private
exports.generateIntervention = async (req, res) => {
    try {
        const { studentId, studentName, gpa, flagReason, recentComment, sentimentScore, topicGaps } = req.body;

        // Reuse logic from Edge Function
        const systemPrompt = `You are an expert educational psychologist and academic advisor. Your role is to analyze student data and generate personalized intervention plans.
    You must respond with a valid JSON object containing exactly these four arrays:
    {
      "mental_health": ["recommendation 1"],
      "academic_focus": ["focus area 1"],
      "resources": ["resource 1"],
      "communication_tips": ["tip 1"]
    }`;

        const userPrompt = `Generate a personalized intervention plan for:
    - Name: ${studentName}
    - GPA: ${gpa}
    - Flag Reason: ${flagReason}
    - Sentiment: ${sentimentScore}%
    - Gaps: ${topicGaps?.join(", ")}
    - Recent Comment: "${recentComment}"
    `;

        // Using native fetch (Node 18+)
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
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
            throw new Error(`AI Gateway Error: ${response.statusText}`);
        }

        const aiResponse = await response.json();
        const content = aiResponse.choices?.[0]?.message?.content;

        // Parse logic
        let plan;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            plan = JSON.parse(jsonMatch[0]);
        } else {
            plan = { error: "Failed to parse JSON" };
        }

        // Save to DB (optional, but good practice)
        // await AiAnalysis.create({ ... });

        res.json({ plan });

    } catch (error) {
        console.error('AI Gen Error:', error);
        // Fallback plan if AI fails (same as edge function)
        res.json({
            plan: {
                mental_health: ["Schedule counselor check-in", "Practice mindfulness"],
                academic_focus: ["Review basics", "Study schedule"],
                resources: ["Khan Academy", "Study group"],
                communication_tips: ["Be supportive", "Celebrate small wins"]
            }
        });
    }
};
