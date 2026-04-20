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
You are an expert collectibles identifier. Look at the image and identify the EXACT item — include brand, model name, year/series, variant, and packaging type.
Also output the item's physical_format as one of: "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "comic book", "other".
Then generate 2-3 SHORT condition questions relevant to that physical format that affect resale value. Keep each question under 8 words.
Set confidence to "high" if you are certain of the exact item, "low" if you can only make a general guess, or "unknown" if you cannot identify at all.`
      : `${contextLine}
You are an expert collectibles identifier. The user described: "${text_query}".
Identify the EXACT item and its physical_format. Generate 2-3 SHORT condition questions relevant to that format. Keep each under 8 words.
Set confidence to "high" if you are certain, "low" if making a general guess, or "unknown" if you cannot identify it.`;

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
    if (image_url) {
      invokePayload.file_urls = [image_url];
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