import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Combined identify + appraise in a single function call to avoid frontend timeout issues
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { image_urls, text_query, collection_type, condition_answers, known_size } = body;

    const allImageUrls = image_urls?.length ? image_urls : [];
    if (!allImageUrls.length && !text_query) {
      return Response.json({ error: 'Provide image_urls or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const knownSizeLine = known_size ? `CONFIRMED SIZE: The user confirmed this item is ${known_size} tall. Use this exact size to identify the correct model/variant.` : '';
    const answersLine = condition_answers?.length
      ? `Additional details confirmed by the user (treat as ground truth): ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
      : '';
    const multiImageNote = allImageUrls.length > 1
      ? `The user provided ${allImageUrls.length} photos of the same item. Use all images together.`
      : '';

    // Step 1: Identify the item and generate condition questions
    const identifyPrompt = allImageUrls.length
      ? `${contextLine} ${knownSizeLine} ${multiImageNote}
You are an expert collectibles identifier. Examine the image(s) and:
1. Identify the EXACT item (brand, model name, year/series, variant). Be specific.
2. Determine the physical_format: one of "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "pottery/ceramics", "flatware/cutlery", "other".
3. Generate 2-3 condition questions that affect resale value. For items made in multiple sizes, ask about height FIRST with known size options as choices, always include "Other / I'll measure" as last option.
Set confidence to "high" if certain of exact model, "low" if only brand/category is clear.`
      : `${contextLine} ${knownSizeLine}
You are an expert collectibles identifier. The user described: "${text_query}".
1. Identify the EXACT item (brand, model name, year/series, variant).
2. Determine the physical_format.
3. Generate 2-3 condition questions that affect resale value.
Set confidence to "high" if certain, "low" if making a general guess.`;

    const identifySchema = {
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

    const identifyPayload = {
      prompt: identifyPrompt,
      response_json_schema: identifySchema,
      model: 'gemini_3_flash',
    };
    if (allImageUrls.length) identifyPayload.file_urls = allImageUrls;

    const identifyResult = await base44.integrations.Core.InvokeLLM(identifyPayload);

    // Filter trading-card questions for die-cast items
    const format = (identifyResult.physical_format || '').toLowerCase();
    const identified = identifyResult.identified_item || '';
    const CARD_KEYWORDS = ['corner', 'centering', 'holo', 'surface scratch', 'print line', 'psa', 'bgs', 'grading', 'grade', 'edge wear'];
    const isDieCast = format.includes('blister') || format.includes('die-cast') || format.includes('diecast') ||
      identified.toLowerCase().includes('hot wheels') || identified.toLowerCase().includes('matchbox');
    const isCard = format.includes('trading card') || identified.toLowerCase().includes('pokemon card');

    let questions = identifyResult.questions || [];
    if (isDieCast && !isCard) {
      questions = questions.filter(q => !CARD_KEYWORDS.some(kw => q.question.toLowerCase().includes(kw)));
      if (questions.length === 0) {
        questions = [
          { id: 'blister', question: 'Is the blister bubble intact?', type: 'yesno' },
          { id: 'card_bend', question: 'Any card backing bends or creases?', type: 'yesno' },
          { id: 'wheels', question: 'Do wheels spin freely?', type: 'yesno' },
        ];
      }
    }

    // Return identification result + questions for user to answer
    return Response.json({
      phase: 'questions',
      identified_item: identified,
      confidence: identifyResult.confidence || 'high',
      questions,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});