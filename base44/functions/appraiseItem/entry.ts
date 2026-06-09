import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const body = await req.json();
    const { image_url, image_urls, text_query, collection_type, condition, condition_answers, identified_item } = body;

    const allImageUrls = image_urls?.length ? image_urls : (image_url ? [image_url] : []);
    if (!allImageUrls.length && !text_query && !identified_item) {
      return Response.json({ error: 'Provide image_url(s), text_query, or identified_item' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const conditionLine = condition ? `Condition: ${condition}.` : '';
    const identifiedLine = identified_item ? `This item has been identified as: "${identified_item}".` : '';
    const answersLine = condition_answers?.length
      ? `User-confirmed details (treat as ground truth): ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
      : '';

    const itemRef = identified_item || text_query || 'the item in the image';

    const prompt = `You are a specialist collectibles appraiser. ${contextLine} ${identifiedLine} ${conditionLine} ${answersLine}

Item to appraise: "${itemRef}"

Search eBay sold listings, Mercari, StockX (if applicable), and The RealReal (if luxury) for recent actual sold prices of this EXACT item/variant.

TITLE RULES — be specific and collector-grade:
- Include brand/manufacturer, exact series name, exact model name, year, color, and packaging type.
- Example good: "Matchbox Moving Parts 2004 Honda S2000 — White, Blister Carded"
- NEVER use generic words like "Toy Car" or "Collectible" as the only descriptor.

NOTES — write for a collector (under 80 words): mention the specific series, what makes this notable, any special features, packaging state if known.

Provide: estimated_value (median sold price), value_low, value_high, title, 3-6 lowercase tags, notes, appraisal_reasoning (1-2 sentences citing sources/reasoning). Adjust all values for confirmed condition.

Respond ONLY with valid JSON: {"title":"string","tags":["string"],"notes":"string","value_low":0,"value_high":0,"estimated_value":0,"appraisal_reasoning":"string"}`;

    const res = await openai.chat.completions.create({
      model: 'gpt-4o-search-preview',
      messages: [{ role: 'user', content: prompt }],
      web_search_options: {},
    });

    const raw = res.choices?.[0]?.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in OpenAI response');
    const result = JSON.parse(jsonMatch[0]);

    return Response.json({ appraisal: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});