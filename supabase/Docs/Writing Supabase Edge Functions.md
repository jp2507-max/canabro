---
# Specify the following for Cursor rules
description: Coding rules for Supabase Edge Functions in Canabro
globs: "supabase/functions/**/*.ts"
---

# Supabase Edge Functions for Canabro

This document explains how to create and use Supabase Edge Functions in the Canabro application.

## Overview

Supabase Edge Functions are server-side functions that run on the edge, close to your users. They are built on Deno and allow you to run custom server-side logic that:

1. Is not suitable for database functions
2. Needs to interact with external APIs
3. Requires complex processing or authentication logic
4. Benefits from being executed closer to users

## Use Cases in Canabro

Edge Functions in Canabro are used for:

1. **Plant Identification**: Processing images and connecting to external plant recognition APIs
2. **Weather Integration**: Fetching local weather data for plant care recommendations
3. **Push Notifications**: Sending scheduled reminders about plant care
4. **Data Aggregation**: Complex reporting that combines data from multiple sources
5. **Third-party Authentication**: Additional auth providers or custom auth flows

## Setting Up Edge Functions

### Prerequisites

1. Install the Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

### Creating an Edge Function

1. Create a new function:
   ```bash
   supabase functions new identify-plant
   ```

2. This creates a file structure:
   ```
   /supabase
     /functions
       /identify-plant
         /index.ts
   ```

## Writing Edge Functions

### Basic Function Structure

```typescript
// supabase/functions/identify-plant/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );
    
    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Process the request body
    const { imageBase64 } = await req.json();
    
    // Call external plant identification API
    const identificationResult = await identifyPlantFromImage(imageBase64);
    
    // Return the result
    return new Response(
      JSON.stringify({ 
        identified: true,
        plant: identificationResult,
        message: 'Plant identified successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Function to identify plant (implementation depends on the API you're using)
async function identifyPlantFromImage(imageBase64: string) {
  // Example implementation using a fictional API
  const response = await fetch('https://plant-id-api.example.com/identify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'API-Key': Deno.env.get('PLANT_API_KEY') ?? '',
    },
    body: JSON.stringify({ image: imageBase64 }),
  });
  
  return await response.json();
}
```

### Deploying Edge Functions

```bash
# Deploy a specific function
supabase functions deploy identify-plant --project-ref your-project-ref

# Deploy all functions
supabase functions deploy --project-ref your-project-ref
```

### Testing Edge Functions Locally

```bash
# Start local development server
supabase start

# Run a specific function locally
supabase functions serve identify-plant --env-file .env.local
```

## Calling Edge Functions from the App

### Using Supabase JS Client

```typescript
import { supabase } from '../lib/supabase';

// Call the function
const identifyPlant = async (imageBase64: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('identify-plant', {
      body: { imageBase64 },
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error identifying plant:', error);
    throw error;
  }
};
```

### Handling Environment Variables

Store sensitive API keys and configuration in Supabase:

```bash
# Set environment variables for edge functions
supabase secrets set PLANT_API_KEY=your-api-key-here --project-ref your-project-ref
```

## Security Best Practices

1. **Authentication**: Validate the user is authenticated before processing requests
2. **Authorization**: Check that the user has permission to access requested resources
3. **Validation**: Validate all input data before processing
4. **Rate Limiting**: Implement rate limiting for functions that call external APIs
5. **Secret Management**: Never hardcode secrets; use environment variables
6. **CORS**: Configure CORS headers properly to prevent unauthorized access

## Example: Plant Care Notification Function

```typescript
// supabase/functions/plant-care-reminder/index.ts
import { serve } from 'https://deno.land/std@0.131.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

serve(async (req) => {
  try {
    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Get plants that need watering today
    const { data: plants, error } = await supabaseAdmin
      .from('plants')
      .select('id, name, user_id, last_watered_date')
      .lt('next_watering_date', new Date().toISOString());
    
    if (error) throw error;
    
    // Group by user for efficiency
    const userPlants = plants.reduce((acc, plant) => {
      acc[plant.user_id] = acc[plant.user_id] || [];
      acc[plant.user_id].push(plant);
      return acc;
    }, {});
    
    // Send notifications to each user
    for (const [userId, userPlantList] of Object.entries(userPlants)) {
      // Get user's push notification token
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('push_notification_token')
        .eq('id', userId)
        .single();
      
      if (profile?.push_notification_token) {
        await sendPushNotification(
          profile.push_notification_token,
          `Time to water ${userPlantList.length} plants!`,
          `Your plants need attention: ${userPlantList.map(p => p.name).join(', ')}`
        );
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, plantsProcessed: plants.length }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotification(token, title, body) {
  // Implementation depends on your push notification service
  // Example using Expo Push Notifications
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: token,
      title,
      body,
      data: { screen: 'PlantList' },
    }),
  });
}
```

## Scheduled Functions

To run edge functions on a schedule, use Supabase's scheduled functions feature:

```bash
# Deploy a scheduled function (runs every day at 9am)
supabase functions deploy plant-care-reminder --project-ref your-project-ref
supabase schedule create --name daily-plant-reminder --function plant-care-reminder --schedule "0 9 * * *" --project-ref your-project-ref
```

## Monitoring and Debugging

- View function logs in the Supabase dashboard
- Use `console.log()` statements for debugging (visible in Function Logs)
- Monitor function performance using the Metrics tab
- Set up alerts for function errors or high invocation rates
