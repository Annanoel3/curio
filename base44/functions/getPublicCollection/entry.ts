import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { share_token } = body;

    if (!share_token) {
      return Response.json({ error: 'share_token required' }, { status: 400 });
    }

    const cols = await base44.asServiceRole.entities.Collection.filter({ share_token, is_public: true });
    if (!cols.length) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }
    const collection = cols[0];
    const items = await base44.asServiceRole.entities.Item.filter({ collection_id: collection.id }, '-created_date');

    return Response.json({ collection, items });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});