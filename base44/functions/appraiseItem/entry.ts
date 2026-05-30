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
    You are a collectibles appraiser. Based on your training knowledge of collector markets:
    1. Identify the exact item, variant, year, and packaging from the image.
    2. Research typical sold prices for this exact item. For luxury goods, check The RealReal, Poshmark, and Mercari. For sneakers/collectibles, also check StockX and eBay sold listings. For other items, check eBay and Mercari.
    3. Calculate value_low, value_high, and estimated_value as the AVERAGE of recent sold prices (not as a range, but the actual mid-point from multiple recent sales).
    4. Provide: estimated_value (typical sold price), value_low (low end), value_high (high end), title, 3-6 lowercase tags, brief notes under 80 words, and a short appraisal_reasoning explaining your estimate.
    5. Condition: ${condition || 'assess from image'}.`
       : `${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}
    You are a collectibles appraiser. For the item: "${text_query || identified_item}":
    1. Research typical sold prices. For luxury goods, check The RealReal, Poshmark, and Mercari. For sneakers/collectibles, also check StockX and eBay. For other items, check eBay and Mercari.
    2. Calculate value_low, value_high, and estimated_value as the AVERAGE of recent sold prices from multiple sources.
    3. Provide: estimated_value (typical sold price), value_low (low end), value_high (high end), title, 3-6 lowercase tags, brief notes under 80 words, and a short appraisal_reasoning.
    4. Condition: ${condition || 'not specified'}.`;

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

    // For appraisal, skip re-sending images if we already have an identified_item
    // (images slow down the request significantly and we already know what it is)
    const invokePayload = {
      prompt,
      response_json_schema: schema,
      model: 'gemini_3_flash',
      add_context_from_internet: true,  // Search the web for current prices
    };
    if (allImageUrls.length && !identified_item) {
      invokePayload.file_urls = allImageUrls;
    }

    const result = await base44.integrations.Core.InvokeLLM(invokePayload);

    return Response.json({ appraisal: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});