import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { file_url, collection_id, collection_type } = body;

    if (!file_url || !collection_id) {
      return Response.json({ error: 'file_url and collection_id are required' }, { status: 400 });
    }

    const contextLine = collection_type ? `The collection type is: ${collection_type}.` : '';

    const extracted = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                notes: { type: 'string' },
                estimated_value: { type: 'number' },
                tags: { type: 'array', items: { type: 'string' } },
                quantity: { type: 'integer' }
              },
              required: ['title']
            }
          }
        }
      }
    });

    if (extracted.status !== 'success' || !extracted.output) {
      // Try LLM fallback for unstructured files
      const fileContent = await fetch(file_url).then(r => r.text()).catch(() => null);
      if (!fileContent) {
        return Response.json({ error: 'Could not read file' }, { status: 400 });
      }

      const llmResult = await base44.integrations.Core.InvokeLLM({
        prompt: `${contextLine}
Extract a list of collectible items from the following text. For each item extract: title, notes (any description/condition info), estimated_value (number, if mentioned), tags (array of relevant keywords), quantity (integer, default 1).
Text:
${fileContent.slice(0, 8000)}`,
        response_json_schema: {
          type: 'object',
          properties: {
            items: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  notes: { type: 'string' },
                  estimated_value: { type: 'number' },
                  tags: { type: 'array', items: { type: 'string' } },
                  quantity: { type: 'integer' }
                },
                required: ['title']
              }
            }
          }
        }
      });

      const items = llmResult?.items || [];
      if (!items.length) return Response.json({ error: 'No items found in file' }, { status: 400 });

      const created = await base44.asServiceRole.entities.Item.bulkCreate(
        items.map(item => ({ ...item, collection_id, status: 'owned', quantity: item.quantity || 1 }))
      );
      return Response.json({ created: created.length });
    }

    const items = (extracted.output?.items || extracted.output || []);
    if (!items.length) return Response.json({ error: 'No items found in file' }, { status: 400 });

    const created = await base44.asServiceRole.entities.Item.bulkCreate(
      items.map(item => ({ ...item, collection_id, status: 'owned', quantity: item.quantity || 1 }))
    );

    return Response.json({ created: created.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});