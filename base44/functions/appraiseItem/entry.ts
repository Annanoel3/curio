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
3. LOOK UP recently SOLD/COMPLETED listings on eBay (not asking prices — only actual sold transactions) for this exact item and variant. Search eBay completed listings, recent sales, and other secondary market data (COMC, StockX, recent auction results). Base your value ONLY on what items actually sold for, not what sellers are asking.
4. Provide a tight realistic value range in USD based on recent actual sales. If you find listings where this exact item sold for $25-$35, say $25-$35 — do not inflate. Be honest and conservative. Loose vs boxed condition matters significantly.
5. Extract a precise title (include variant details), 3-6 lowercase tags, and notes summarizing condition hints, identification reasoning, and what real sales data you found (under 150 words).`
      : `${contextLine}
You are a world-class expert appraiser for collectibles with deep knowledge of variants, editions, and market pricing.

The user asked: "${text_query}".
1. Identify the most specific version of this item based on what's described.
2. LOOK UP recently SOLD/COMPLETED eBay listings (not asking prices — actual sold transactions) plus any other secondary market sales data for this exact item. Base your value ONLY on what items have actually sold for recently.
3. Provide a realistic current fair-market value range in USD grounded in actual sales, not speculation. Be honest and conservative — do not inflate values.
4. Include a precise title, 3-6 lowercase tags, and brief notes mentioning the real sales evidence you found (under 150 words).`;

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