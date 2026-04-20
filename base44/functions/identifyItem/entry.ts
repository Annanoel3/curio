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
You are an expert collectibles identifier. Look at the image and identify the item as precisely as possible.
Then generate 2-3 SHORT, specific yes/no or multiple-choice questions that would meaningfully affect this item's value.
Questions should be item-specific — e.g. for a boxed die-cast car: "Does it have the original box?", for a trading card: "Are there any creases or edge wear?".
Keep questions very brief (under 8 words each). Max 3 questions. Only ask things that genuinely affect price.`
      : `${contextLine}
You are an expert collectibles identifier. The user described: "${text_query}".
Identify the item as precisely as possible, then generate 2-3 SHORT, specific yes/no or multiple-choice questions that would meaningfully affect this item's value.
Keep questions very brief (under 8 words each). Max 3 questions.`;

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
      model: 'gemini_3_flash',
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