import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, image_urls, text_query, collection_type, condition, condition_answers, identified_item } = body;

    const allImageUrls = image_urls?.length ? image_urls : (image_url ? [image_url] : []);

    if (!allImageUrls.length && !text_query) {
      return Response.json({ error: 'Provide image_url(s) or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const conditionLine = condition
      ? `The item's condition is: ${condition}. Value it specifically for this condition — do not assume a different condition.`
      : '';
    const identifiedLine = identified_item ? `This item has already been identified as: ${identified_item}.` : '';
    const answersLine = condition_answers && condition_answers.length
      ? `Additional details confirmed by the user (treat these as ground truth — do NOT override them with assumptions): ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
      : '';

    const multiImageNote = allImageUrls.length > 1
      ? `The user has provided ${allImageUrls.length} photos of the same item. Use all images together for a thorough appraisal.`
      : '';

    const prompt = allImageUrls.length
      ? `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine} ${multiImageNote}
You are a precise, data-driven collectibles appraiser. Your job is to find what this item ACTUALLY sells for — not high, not low, but accurate.

Examine the image. Follow these steps exactly:
1. IDENTIFY the exact item, variant, year, and packaging.
2. SEARCH for recently SOLD/COMPLETED listings on eBay (sold filter), Mercari sold, and check Walmart/Target for retail shelf price if still in production.
3. PRICE DISCIPLINE — critical: List out the individual sold prices you find. Remove the single highest and single lowest as outliers. Take the MEDIAN of the remaining prices. That median is your estimated_value. Do not round up. Do not inflate.
   - Example: sold prices $5.99, $7.50, $8.99, $9.99, $14.00 → remove $5.99 and $14.00 → median of $7.50, $8.99, $9.99 = $8.99 estimated_value
   - value_low = the lowest non-outlier sold price, value_high = the highest non-outlier sold price
4. Condition context: ${condition || 'assess from image'}. Adjust median accordingly if condition is notably above or below average.
5. In appraisal_reasoning: list the actual sold prices you found, show which you removed as outliers, and state the resulting median. Be specific.
6. Extract a precise title, 3-6 lowercase tags, and concise notes (under 100 words).`
      : `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}
You are a precise, data-driven collectibles appraiser. Your job is to find what this item ACTUALLY sells for — not high, not low, but accurate.

Item: "${text_query}".
1. Identify the exact variant, year, and packaging.
2. SEARCH for recently SOLD/COMPLETED listings on eBay (sold filter), Mercari sold, and retail shelf price if still in production.
3. PRICE DISCIPLINE — critical: List the individual sold prices you find. Remove the single highest and single lowest as outliers. Take the MEDIAN of the remaining prices. That is your estimated_value. Do not round up or inflate.
   - value_low = lowest non-outlier sold price, value_high = highest non-outlier sold price
4. Condition: ${condition || 'not specified'}. Adjust if condition is notably above or below average.
5. In appraisal_reasoning: list the actual sold prices, show which you removed, and state the resulting median.
6. Include a precise title, 3-6 lowercase tags, and brief notes (under 100 words).`;

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
    if (allImageUrls.length) {
      invokePayload.file_urls = allImageUrls;
    }

    const result = await base44.integrations.Core.InvokeLLM(invokePayload);

    return Response.json({ appraisal: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});