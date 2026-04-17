
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { essay_text } = await req.json()

    if (!essay_text) {
      throw new Error('Essay text is required')
    }

    const apiKey = Deno.env.get('DEEPSEEK_API_KEY')
    if (!apiKey) {
      throw new Error('DEEPSEEK_API_KEY is not set')
    }

    const systemPrompt = `You are a strict IELTS examiner. Grade this essay from 0-9. Return JSON with band_score, feedback_summary_bn (Bangla), grammar_errors array, improved_version.`

    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: essay_text }
        ],
        response_format: { type: 'json_object' }
      })
    })

    const data = await response.json()
    
    if (data.error) {
      throw new Error(`DeepSeek API error: ${data.error.message}`)
    }

    const evaluation = JSON.parse(data.choices[0].message.content)

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
