// Edge Function: Cleanup Failed Registration
// This runs in Deno runtime with different type definitions
// @ts-ignore: Deno types not available in main project
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequestBody {
  userId: string;
}

// @ts-ignore: Deno.serve not available in Node.js environment  
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create supabase client with service role (server-side only)
    const supabaseAdmin = createClient(
      // @ts-ignore: Deno.env not available in Node.js environment
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno.env not available in Node.js environment
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Create client for user verification
    const supabaseClient = createClient(
      // @ts-ignore: Deno.env not available in Node.js environment
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno.env not available in Node.js environment
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    // Verify the user is authenticated with the anon key
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Parse request body
    const { userId }: CleanupRequestBody = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Security check: Only allow users to clean up their own registration
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Can only cleanup your own registration' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if profile exists - if it does, don't cleanup the auth user
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profile) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Profile exists, no cleanup needed' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Only cleanup if profile doesn't exist (indicating failed registration)
    if (profileError?.code === 'PGRST116') { // Not found
      // Delete the auth user using admin privileges
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Failed to delete auth user:', deleteError);
        return new Response(
          JSON.stringify({ error: 'Failed to cleanup registration' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Failed registration cleaned up successfully' 
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // If there was another error checking profile, return error
    return new Response(
      JSON.stringify({ error: 'Unable to verify registration state' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 