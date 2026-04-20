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
3. LOOK UP recently SOLD/COMPLETED listings across multiple marketplaces: eBay completed listings, Mercari sold listings, Facebook Marketplace recent sales, Amazon sold listings, specialty collector sites (e.g. hobbyDB, BigBadToyStore, BBTS, Entertainment Earth), and any relevant auction results. Do NOT use asking prices — only actual completed sales. Cross-reference at least 2-3 sources if possible.
4. Provide a tight realistic value range in USD based on the median of recent actual sales across these platforms. Be honest and conservative — if items consistently sell for $25-$35, say $25-$35. Loose vs boxed/carded condition matters significantly.
5. Extract a precise title (include variant details), 3-6 lowercase tags, and notes summarizing condition hints, identification reasoning, and what real cross-platform sales data supports the value (under 150 words).`
      : `${contextLine}
You are a world-class expert appraiser for collectibles with deep knowledge of variants, editions, and market pricing.

The user asked: "${text_query}".
1. Identify the most specific version of this item based on what's described.
2. LOOK UP recently SOLD/COMPLETED listings across eBay, Mercari, Facebook Marketplace, Amazon, and collector specialty sites — actual sold transactions only, not asking prices. Cross-reference multiple sources.
3. Provide a realistic current fair-market value range in USD based on the median of real cross-platform sales. Be honest and conservative — do not inflate values.
4. Include a precise title, 3-6 lowercase tags, and brief notes mentioning the cross-platform sales evidence (under 150 words).`;

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
      model: 'gemini_3_1_pro',
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