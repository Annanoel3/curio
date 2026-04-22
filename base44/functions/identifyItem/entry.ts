import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_url, image_urls, text_query, collection_type, known_size } = body;

    // Support single or multiple images
    const allImageUrls = image_urls?.length ? image_urls : (image_url ? [image_url] : []);

    if (!allImageUrls.length && !text_query) {
      return Response.json({ error: 'Provide image_url(s) or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const multiImageNote = allImageUrls.length > 1
      ? `The user has provided ${allImageUrls.length} photos of the same item (e.g. front and back). Use all images together to identify it.`
      : '';

    const prompt = allImageUrls.length
      ? `${contextLine} ${multiImageNote}
You are an expert collectibles identifier and appraiser with deep knowledge of art glass, ceramics, figurines, and collectibles.

Step 1 — VISUAL ANALYSIS: Carefully examine every visual detail in the image(s):
- Overall silhouette and shape (e.g. tapered, cylindrical, footed, goblet-shaped, handled)
- Surface decoration: motifs, patterns, textures, frosted vs. clear areas
- Base/foot style: flat, footed, sculptural elements (animals, flowers, etc.)
- Any visible marks, signatures, or etching
- Color and finish

Step 2 — IDENTIFY the EXACT model: Use your visual analysis to match the item to a specific named model/pattern. Do not default to a generic or most-common version — the shape and decoration uniquely identify the piece. Include brand, exact model name, model number if known, and year/series.

Step 3 — OUTPUT physical_format as one of: "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "comic book", "pottery/ceramics", "other".

Step 4 — QUESTIONS: Generate 2-4 questions that affect resale value, in this order:
a) SIZE FIRST (if this item was made in multiple sizes): Ask "What is the height of this piece?" with the known size options for that specific model as choices. ALWAYS include "Other / I'll measure" as the last option. Do NOT assume the size from the photo.
b) Then condition questions relevant to the format.

Set confidence to "high" if you are certain of the exact model, "low" if only the brand/category is clear, or "unknown" if unidentifiable.`
      : `${contextLine}
You are an expert collectibles identifier. The user described: "${text_query}".
Identify the EXACT item (brand, model name, model number, year/series) and its physical_format.

Generate 2-4 questions that affect resale value:
- If this item was made in multiple sizes, ask about height FIRST with known size options as choices. Always include "Other / I'll measure" as the last option.
- Then ask condition questions relevant to the format.

Set confidence to "high" if you are certain of the exact model, "low" if making a general guess, or "unknown" if you cannot identify it.`;

    const schema = {
      type: 'object',
      properties: {
        identified_item: { type: 'string' },
        physical_format: { type: 'string' },
        confidence: { type: 'string', enum: ['high', 'low', 'unknown'] },
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
      model: 'gemini_3_flash',
      add_context_from_internet: true,
    };
    if (allImageUrls.length) {
      invokePayload.file_urls = allImageUrls;
    }

    const result = await base44.integrations.Core.InvokeLLM(invokePayload);

    // Filter out trading-card-specific questions for die-cast items
    const identified = result.identified_item || '';
    const format = (result.physical_format || '').toLowerCase();
    const TRADING_CARD_KEYWORDS = ['corner', 'centering', 'holo', 'surface scratch', 'print line', 'psa', 'bgs', 'grading', 'grade', 'edge wear'];
    const isDieCast = format.includes('blister') || format.includes('die-cast') || format.includes('diecast') ||
      identified.toLowerCase().includes('hot wheels') || identified.toLowerCase().includes('matchbox');
    const isCard = format.includes('trading card') || identified.toLowerCase().includes('trading card') ||
      identified.toLowerCase().includes('pokemon card');

    let questions = result.questions || [];
    if (isDieCast && !isCard) {
      questions = questions.filter(q => !TRADING_CARD_KEYWORDS.some(kw => q.question.toLowerCase().includes(kw)));
      if (questions.length === 0) {
        questions = [
          { id: 'blister', question: 'Is the blister bubble intact?', type: 'yesno' },
          { id: 'card_bend', question: 'Any card backing bends or creases?', type: 'yesno' },
          { id: 'wheels', question: 'Do wheels spin freely?', type: 'yesno' },
        ];
      }
    }

    return Response.json({ ...result, questions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});