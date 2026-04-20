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
2. LOOK UP current and recently SOLD/COMPLETED listings across eBay (both active and sold), Mercari, Facebook Marketplace, Walmart, Target, and collector sites. For common/recent items still available at retail, the retail shelf price is a HARD FLOOR — the secondary market cannot sustainably be below what it costs new.
3. PRICE METHODOLOGY — this is critical: Count how many listings exist at each price point. Use the MODE (most common price) or MEDIAN, never the minimum. Example: if there are 1 listing at $5 and 3 listings at $10.98, the market price is ~$10.98, not $5. A single cheap outlier listing must be IGNORED. Do not average in outliers.
4. Provide a realistic value range. Do NOT deflate. The estimated_value should reflect where the MAJORITY of listings sit, not the cheapest one. Condition: ${condition || 'assess from image'}.
5. In appraisal_reasoning: explicitly state how many listings you found at each price, which you used and why, and the retail price if still sold in stores. Minimum 3 sentences.
6. Extract a precise title with variant/year details, 3-6 lowercase tags, and concise notes (under 120 words).`
      : `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}
You are a world-class expert appraiser for collectibles.

Item: "${text_query}". 
1. Identify the exact variant/version. Compare explicitly to other known variants of the same item and note price differences.
2. LOOK UP current and recently SOLD/COMPLETED listings on eBay, Mercari, Facebook Marketplace, Walmart, Target, and collector sites. For items still at retail, the shelf price is a HARD FLOOR.
3. PRICE METHODOLOGY: Count listings at each price point. Use the MODE or MEDIAN — never the minimum. If 1 listing is at $5 and 3 are at $10.98, the market is $10.98. Ignore single cheap outliers completely.
4. Provide a realistic value range. estimated_value must reflect where the MAJORITY of listings are, not the cheapest. Condition: ${condition || 'not specified'}.
5. In appraisal_reasoning: state how many listings at each price, which you used and why, and the retail price if still sold in stores.
6. Include a precise title, 3-6 lowercase tags, and brief notes (under 120 words).`;

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