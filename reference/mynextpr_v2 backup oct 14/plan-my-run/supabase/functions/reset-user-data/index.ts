import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.75.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const { data: { user } } = await supabaseClient.auth.getUser()

    if (!user) {
      throw new Error('Not authenticated')
    }

    console.log('Resetting data for user:', user.id)

    // Delete all workouts for this user
    const { error: workoutsError } = await supabaseClient
      .from('workouts')
      .delete()
      .eq('user_id', user.id)

    if (workoutsError) {
      console.error('Error deleting workouts:', workoutsError)
      throw workoutsError
    }

    // Delete all plans for this user
    const { error: plansError } = await supabaseClient
      .from('plans')
      .delete()
      .eq('user_id', user.id)

    if (plansError) {
      console.error('Error deleting plans:', plansError)
      throw plansError
    }

    console.log('Successfully reset user data')

    return new Response(
      JSON.stringify({ success: true, message: 'All data reset successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
