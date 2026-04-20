import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Keywords that indicate a question is only appropriate for trading/sports/collectible cards
const TRADING_CARD_KEYWORDS = [
  'corner', 'corners', 'centering', 'holo', 'surface scratch', 'print line',
  'print defect', 'psa', 'bgs', 'grading', 'grade', 'edge wear', 'edge chip'
];

// Returns true if the identified item is a trading/sports/collectible card
function isTradingCard(identified) {
  const lower = (identified || '').toLowerCase();
  return (
    lower.includes('trading card') ||
    lower.includes('sports card') ||
    lower.includes('pokemon card') ||
    lower.includes('magic: the gathering') ||
    lower.includes('yugioh') ||
    lower.includes('baseball card') ||
    lower.includes('football card') ||
    lower.includes('basketball card')
  );
}

// Returns true if the identified item is a blister-carded die-cast toy
function isBlisterDieCast(identified) {
  const lower = (identified || '').toLowerCase();
  return (
    lower.includes('hot wheels') ||
    lower.includes('matchbox') ||
    lower.includes('blister') ||
    lower.includes('die-cast') ||
    lower.includes('diecast') ||
    lower.includes('die cast')
  );
}

// Filter out questions that don't match the item's physical format
function filterQuestions(questions, identified) {
  if (!questions || !questions.length) return questions;

  const tradingCard = isTradingCard(identified);
  const blisterDieCast = isBlisterDieCast(identified);

  if (blisterDieCast && !tradingCard) {
    // Remove any trading-card-specific questions
    return questions.filter(q => {
      const lower = q.question.toLowerCase();
      return !TRADING_CARD_KEYWORDS.some(kw => lower.includes(kw));
    });
  }

  return questions;
}

// Fallback questions for blister-carded die-cast when all questions got filtered out
const BLISTER_DIECAST_FALLBACK = [
  { id: 'blister', question: 'Is the blister bubble intact?', type: 'yesno' },
  { id: 'card_bend', question: 'Any card backing bends or creases?', type: 'yesno' },
  { id: 'wheels', question: 'Do wheels spin freely?', type: 'yesno' },
];

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
Then generate 2-3 SHORT condition questions relevant to that physical format that affect resale value. Keep each question under 8 words.`
      : `${contextLine}
You are an expert collectibles identifier. The user described: "${text_query}".
Identify the EXACT item and its physical_format. Generate 2-3 SHORT condition questions relevant to that format. Keep each under 8 words.`;

    const schema = {
      type: 'object',
      properties: {
        identified_item: { type: 'string' },
        physical_format: { type: 'string' },
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

    // Post-process: filter out inappropriate questions based on format
    const identified = result.identified_item || '';
    const format = (result.physical_format || '').toLowerCase();
    let questions = result.questions || [];

    const isCard = format.includes('trading card') || isTradingCard(identified);
    const isDieCast = format.includes('blister') || format.includes('die-cast') || format.includes('diecast') || isBlisterDieCast(identified);

    if (isDieCast && !isCard) {
      questions = filterQuestions(questions, identified);
      if (questions.length === 0) {
        questions = BLISTER_DIECAST_FALLBACK;
      }
    }

    return Response.json({ ...result, questions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});