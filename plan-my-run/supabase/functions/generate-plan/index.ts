import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // Get user from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { goal_distance, goal_time, fitness_level, age, sex, coach_persona } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build coach-specific system prompts
    const coachPrompts: Record<string, string> = {
      anya: "You are Coach Anya, a marathon specialist who is experienced, goal-oriented, and encouraging. Your style is clear, structured, and focused on long-term achievement.",
      ben: "You are Coach Ben, a speed and agility expert who is performance-focused, technical, and motivational. You emphasize technique and push runners to improve their speed.",
      chloe: "You are Coach Chloe, a trail and ultra specialist who is adventurous, resilient, and mentally focused. You emphasize mental toughness and enjoying the journey."
    };

    const systemPrompt = coachPrompts[coach_persona] || coachPrompts.anya;

    const userPrompt = `Generate a personalized 2-week running plan for:

User Profile:
- Goal: ${goal_distance}km ${goal_time ? `in ${goal_time}` : ''}
- Fitness Level: ${fitness_level}
- Age: ${age}
- Sex: ${sex}

CRITICAL Requirements:
1. Create exactly 14 days of workouts following this STRICT schedule:
   - Day 1 (Monday): Rest Day
   - Day 2 (Tuesday): Running workout
   - Day 3 (Wednesday): Strength Training
   - Day 4 (Thursday): Running workout
   - Day 5 (Friday): Strength Training
   - Day 6 (Saturday): Running workout
   - Day 7 (Sunday): Running workout (typically long run)
   - Day 8 (Monday): Rest Day
   - Day 9 (Tuesday): Running workout
   - Day 10 (Wednesday): Strength Training
   - Day 11 (Thursday): Running workout
   - Day 12 (Friday): Strength Training
   - Day 13 (Saturday): Running workout
   - Day 14 (Sunday): Running workout (typically long run)

2. Running workouts should include variety: easy runs, tempo runs, intervals, long runs
3. Progressive overload throughout the 2 weeks
4. Each workout must include:
   - Title (e.g., "Easy Recovery Run" or "Upper Body Strength")
   - WARMUP: Brief 1-2 sentence warmup (e.g., "5 min easy jog, dynamic stretches")
   - MAIN_SET: Detailed bullet points of the main workout, each bullet should be concise and fit on one line
   - COOLDOWN: Brief 1 sentence cooldown (e.g., "5 min easy jog, static stretches")
   - Estimated duration in minutes
   - Target distance in km (only for running workouts)
5. Balance training stress with recovery
6. Account for injury prevention

CRITICAL FORMATTING RULES:
- Keep warmup and cooldown SHORT (1-2 sentences max)
- Main set MUST be bullet points (use • prefix)
- Each bullet point should be ONE clear instruction
- NO word wrapping - keep each bullet under 60 characters
- For strength: List specific exercises as bullets
- For runs: List pace zones and intervals as bullets

Output Format (JSON):
{
  "plan_overview": "Brief 2-3 sentence overview",
  "workouts": [
    {
      "day": 1,
      "title": "...",
      "type": "easy_run|tempo_run|intervals|long_run|strength|rest",
      "warmup": "5 min easy jog, dynamic stretches",
      "main_set": "• 15 min at easy pace (Zone 2)\n• 20 min at tempo pace\n• 5 min faster than tempo",
      "cooldown": "5 min easy jog, static stretches",
      "duration_minutes": 30,
      "distance_km": 5.0
    }
  ]
}

Return ONLY valid JSON, no markdown or additional text.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI gateway error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;
    
    // Parse the JSON response
    let planData;
    try {
      // Remove markdown code blocks if present - more robust approach
      let jsonString = aiResponse.trim();
      
      // Remove opening markdown code block
      if (jsonString.startsWith('```json')) {
        jsonString = jsonString.substring(7);
      } else if (jsonString.startsWith('```')) {
        jsonString = jsonString.substring(3);
      }
      
      // Remove closing markdown code block
      if (jsonString.endsWith('```')) {
        jsonString = jsonString.substring(0, jsonString.length - 3);
      }
      
      jsonString = jsonString.trim();
      planData = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse);
      console.error('Parse error:', parseError);
      throw new Error('Failed to parse AI-generated plan');
    }

    // Save plan to database
    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .insert({
        user_id: user.id,
        goal_distance: goal_distance,
        goal_time: goal_time,
        fitness_level: fitness_level,
        age: age,
        sex: sex,
        coach_persona: coach_persona,
        plan_overview: planData.plan_overview
      })
      .select()
      .single();

    if (planError) {
      console.error('Error saving plan:', planError);
      throw new Error('Failed to save plan');
    }

    // Save workouts to database
    const workoutsToInsert = planData.workouts.map((workout: any) => ({
      plan_id: plan.id,
      user_id: user.id,
      day: workout.day,
      title: workout.title,
      type: workout.type,
      description: workout.description || '', // Keep for backwards compatibility
      warmup: workout.warmup || '',
      main_set: workout.main_set || '',
      cooldown: workout.cooldown || '',
      duration_minutes: workout.duration_minutes,
      distance_km: workout.distance_km,
      scheduled_date: new Date(Date.now() + (workout.day - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }));

    const { error: workoutsError } = await supabaseClient
      .from('workouts')
      .insert(workoutsToInsert);

    if (workoutsError) {
      console.error('Error saving workouts:', workoutsError);
      throw new Error('Failed to save workouts');
    }

    return new Response(
      JSON.stringify({ ...planData, plan_id: plan.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
