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

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';

    const prompt = image_url
      ? `${contextLine}
You are an expert collectibles identifier. Look at the image and identify the EXACT item — include brand, model name, year/series, variant, and packaging type (e.g. "Hot Wheels 2020 Mainline Honda S2000 GReddy #153/250, mint on card blister pack").

STEP 1 — IDENTIFY THE PHYSICAL FORMAT from the image. Write it in identified_item (e.g. "Hot Wheels 2020 Mainline Honda S2000 GReddy #153/250 — blister-carded die-cast").

STEP 2 — Based ONLY on that physical format, write 2-3 questions. Use this strict mapping:

FORMAT: blister-carded die-cast toy (Hot Wheels, Matchbox, etc.)
→ ALLOWED questions: blister bubble condition, card backing bends/creases, wheel/axle condition
→ FORBIDDEN: "card corners", "card surface", any trading-card language

FORMAT: loose die-cast toy
→ ALLOWED questions: paint chips, scratches, missing parts

FORMAT: trading card / sports card / Pokemon card
→ ALLOWED questions: creases, edge wear, corners, surface scratches

FORMAT: action figure in box
→ ALLOWED questions: box seal, box corner damage

DO NOT mix formats. A Hot Wheels blister pack is NOT a trading card — never ask about card corners or card grading for it.
Keep questions under 8 words each. Max 3 questions.`
      : `${contextLine}
You are an expert collectibles identifier. The user described: "${text_query}".
Identify the EXACT item — include brand, model, year/series, variant, and packaging type.
Determine the physical format, then generate 2-3 SHORT questions specific to that format that affect resale value.
Keep questions under 8 words each. Max 3 questions.`;

    const schema = {
      type: 'object',
      properties: {
        identified_item: { type: 'string', description: 'Brief precise identification e.g. "Jada Toys 1:24 Fast & Furious Suki\'s Honda S2000 (2017 packaging)"' },
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              question: { type: 'string' },
              type: { type: 'string', enum: ['yesno', 'choice'] },
              options: { type: 'array', items: { type: 'string' } }
            },
            required: ['id', 'question', 'type']
          }
        }
      },
      required: ['identified_item', 'questions']
    };

    const invokePayload = {
      prompt,
      response_json_schema: schema,
      model: 'gemini_3_1_pro',
      add_context_from_internet: true,
    };
    if (image_url) {
      invokePayload.file_urls = [image_url];
    }

    const result = await base44.integrations.Core.InvokeLLM(invokePayload);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});