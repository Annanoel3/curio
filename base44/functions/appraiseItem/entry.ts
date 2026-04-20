import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, text_query, collection_type } = body;

    if (!image_url && !text_query) {
      return Response.json({ error: 'Provide image_url or text_query' }, { status: 400 });
    }

    const contextLine = collection_type
      ? `The user collects: ${collection_type}.`
      : '';

    const prompt = image_url
      ? `${contextLine}
You are a world-class expert appraiser and cataloguer for collectibles, with deep knowledge of subtle variants, production runs, and edition differences.

Examine the attached image with extreme precision. Your task:
1. IDENTIFY the exact item — pay close attention to fine visual details that distinguish variants: color shades, wheel types, tampo/decal placement, body casting differences, blister card vs loose, paint apps, country of origin markings, font styles, copyright years, logo versions, or any other distinguishing feature visible in the image. Do NOT guess — describe exactly what you see.
2. STATE clearly which specific variant or version this is, and explain what visual evidence supports that identification.
3. RESEARCH current fair-market prices for this exact variant (not a similar one) — loose vs boxed condition matters.
4. Provide a tight value range in USD. If there are two known variants with different values, make sure you've identified the correct one based on the visual evidence.
5. Extract a precise title (include variant details), 3-6 lowercase tags, and notes summarizing condition hints and identification reasoning (under 150 words).`
      : `${contextLine}
You are a world-class expert appraiser for collectibles with deep knowledge of variants, editions, and market pricing.

The user asked: "${text_query}".
Identify the most specific version of this item based on what's described. If there are known variants with different values, explain which one is most likely being described and why.
Provide a current fair-market value range in USD, a precise title, 3-6 lowercase tags, and brief notes (under 150 words).`;

    const schema = {
      type: 'object',
      properties: {
        title: { type: 'string' },
        tags: { type: 'array', items: { type: 'string' } },
        notes: { type: 'string' },
        value_low: { type: 'number' },
        value_high: { type: 'number' },
        estimated_value: { type: 'number' },
        appraisal_reasoning: { type: 'string' },
        attributes: {
          type: 'object',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['title', 'tags', 'notes', 'value_low', 'value_high', 'estimated_value']
    };

    const invokePayload = {
      prompt,
      response_json_schema: schema,
      model: 'gemini_3_flash',
      add_context_from_internet: true
    };
    if (image_url) {
      invokePayload.file_urls = [image_url];
    }

    const result = await base44.integrations.Core.InvokeLLM(invokePayload);

    return Response.json({ appraisal: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});