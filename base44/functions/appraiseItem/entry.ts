import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, text_query, collection_type, condition, condition_answers, identified_item } = body;

    if (!image_url && !text_query) {
      return Response.json({ error: 'Provide image_url or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const conditionLine = condition
      ? `The item's condition is: ${condition}. Value it specifically for this condition — do not assume a different condition.`
      : '';
    const identifiedLine = identified_item ? `This item has already been identified as: ${identified_item}.` : '';
    const answersLine = condition_answers && condition_answers.length
      ? `Additional condition details provided by the user: ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
      : '';

    const prompt = image_url
      ? `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}
You are a world-class expert appraiser for collectibles with deep knowledge of variants, production years, and edition differences.

Examine the image. Your task:
1. CONFIRM the exact item and variant. Note the specific production year/release, packaging version, and any key visual details that distinguish it from similar items. Compare it explicitly to other known variants and explain what makes this one different.
2. LOOK UP recently SOLD/COMPLETED listings across eBay completed listings, Mercari, Facebook Marketplace, and collector sites. Only actual sales — not asking prices. If only a few listings exist (e.g. 2 at $30), that IS the market.
3. Provide a realistic value range reflecting actual sales. Do not deflate. Condition: ${condition || 'assess from image'}.
4. In appraisal_reasoning: be SPECIFIC — mention the exact release year, how it compares to other variants/years of the same item and their prices, what sales data you found, and why this item is valued where it is. Minimum 3 sentences of specific detail.
5. Extract a precise title with variant/year details, 3-6 lowercase tags, and concise notes (under 120 words).`
      : `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}
You are a world-class expert appraiser for collectibles.

Item: "${text_query}". 
1. Identify the exact variant/version. Compare explicitly to other known variants of the same item and note price differences.
2. LOOK UP recently SOLD/COMPLETED listings on eBay, Mercari, Facebook Marketplace, and collector sites — actual sales only. Do not deflate.
3. Provide a realistic value range. Condition: ${condition || 'not specified'}.
4. In appraisal_reasoning: be SPECIFIC — note the exact release, how it compares to other variants price-wise, what sales data supports the value.
5. Include a precise title, 3-6 lowercase tags, and brief notes (under 120 words).`;

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