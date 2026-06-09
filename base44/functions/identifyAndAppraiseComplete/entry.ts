import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Does identify + appraise in ONE server-side chain.
// phase=identify → runs identify only, returns questions (fast, ~8s)
// phase=appraise → runs appraise only using already-identified item name (fast, ~8s)
// Both are text-only when possible to stay fast.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { phase, image_urls, text_query, collection_type, condition_answers, identified_item, known_size, user_notes } = body;

    const allImageUrls = image_urls?.length ? image_urls : [];

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const knownSizeLine = known_size ? `CONFIRMED SIZE: The user confirmed this item is ${known_size} tall.` : '';
    const multiImageNote = allImageUrls.length > 1
      ? `The user provided ${allImageUrls.length} photos of the same item. Use all images together.`
      : '';

    // ── PHASE: IDENTIFY ──────────────────────────────────────────────────
    if (phase === 'identify') {
      if (!allImageUrls.length && !text_query) {
        return Response.json({ error: 'Provide image_urls or text_query' }, { status: 400 });
      }

      const userNotesLine = user_notes ? `\nIMPORTANT — User-provided details (treat as confirmed ground truth, override visual assumptions with these): "${user_notes}"` : '';

      const identifyPrompt = allImageUrls.length
        ? `${contextLine} ${knownSizeLine} ${multiImageNote}${userNotesLine}
You are an expert collectibles identifier with deep knowledge of antiques, flatware, ceramics, die-cast, and collectibles.

STEP 1 — MANDATORY PHYSICAL COUNT (do this before anything else):
- Count every countable structural feature: tines on a fork, petals on a flower, legs, panels, etc. State the exact count explicitly (e.g. "I count 5 tines"). If the user's notes confirm a count, use that as ground truth.
- A standard dinner fork has 4 tines. A 5-tine fork is a RARE, distinct collectible variant — do NOT assume 4 tines unless you have counted 4.
- For any non-standard count, flag it prominently — it IS the key identifier.

STEP 2 — VISUAL ANALYSIS: Examine every detail: shape, silhouette, surface decoration, base/foot style, any marks/signatures/hallmarks (read ALL text exactly), color, finish, unusual features.

STEP 3 — IDENTIFY the EXACT model/variant using your physical count + visual analysis. Include brand, exact model name, model number if known, year/series. Do NOT default to the most common version if physical features suggest otherwise.

STEP 4 — physical_format: one of "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "pottery/ceramics", "flatware/cutlery", "other".

STEP 5 — Generate 2-3 condition questions that directly affect resale value for THIS specific identified item.
- Only ask about SIZE if you have confirmed knowledge that this exact item was produced in multiple distinct sizes that sell for different prices. If in doubt, do NOT ask about size.
- Ask questions that are specific to the item's format and known collector concerns — not generic questions that could apply to anything.

Set confidence to "high" if certain of exact model/variant, "low" if only brand/category is clear.`
        : `${contextLine} ${knownSizeLine}${userNotesLine}
You are an expert collectibles identifier. The user described: "${text_query}".
CRITICAL: If the description or user notes mention any non-standard physical feature (e.g. "5 tines", "5 prong", unusual size, rare marking) — treat this as confirmed ground truth and identify the item AS that specific variant, not the standard version.
1. Identify the EXACT item (brand, model name, year/series, variant). Be specific.
2. Determine the physical_format.
3. Generate 2-3 condition questions that directly affect resale value for THIS specific item. Only ask about size if you have confirmed knowledge this exact item was made in multiple sizes with different values. If in doubt, skip the size question.
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
      };
      if (allImageUrls.length) identifyPayload.file_urls = allImageUrls;

      const identifyResult = await base44.integrations.Core.InvokeLLM(identifyPayload);

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

      return Response.json({
        phase: 'questions',
        identified_item: identified,
        confidence: identifyResult.confidence || 'high',
        questions,
      });
    }

    // ── PHASE: APPRAISE ───────────────────────────────────────────────────
    if (phase === 'appraise') {
      if (!identified_item && !text_query) {
        return Response.json({ error: 'Provide identified_item or text_query' }, { status: 400 });
      }

      const itemName = identified_item || text_query;
      const answersLine = condition_answers?.length
        ? `User-confirmed condition details (treat as ground truth): ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
        : '';
      const userNotesLine = user_notes ? `Additional user notes (treat as ground truth): "${user_notes}".` : '';

      const appraisePrompt = `You are a specialist collectibles appraiser writing catalog entries for a collector's database.

Item: "${itemName}". ${answersLine} ${userNotesLine} ${contextLine}

TITLE RULES — be SPECIFIC and collector-grade, not generic:
- Include brand/manufacturer, exact series name, exact model name, year, color, and packaging type.
- Example good title: "Matchbox Moving Parts 2004 Honda S2000 — White, Blister Carded"
- Example bad title: "2004 Honda S2000 Toy Car"
- NEVER use generic words like "Toy Car", "Collectible", "Figurine" as the only descriptor — those must accompany specific identifiers.

NOTES RULES — write for a collector, not a general audience (under 80 words):
- Mention the specific series, what makes this model notable or collectible, any special features (moving parts, livery, variant color, etc.).
- Mention packaging state if known.
- Do NOT write generic filler like "highly sought after" or "enhances its value".

Give estimated_value (median eBay/Mercari sold price), value_low, value_high, title, 3-6 lowercase tags, notes, appraisal_reasoning (1-2 sentences). Adjust for condition above.`;

      const appraiseSchema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          tags: { type: 'array', items: { type: 'string' } },
          notes: { type: 'string' },
          value_low: { type: 'number' },
          value_high: { type: 'number' },
          estimated_value: { type: 'number' },
          appraisal_reasoning: { type: 'string' },
          attributes: { type: 'object', additionalProperties: { type: 'string' } }
        },
        required: ['title', 'tags', 'notes', 'value_low', 'value_high', 'estimated_value']
      };

      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-search-preview',
          messages: [
            {
              role: 'user',
              content: appraisePrompt + `\n\nRespond ONLY with a valid JSON object matching this schema: ${JSON.stringify(appraiseSchema)}. No markdown, no explanation, just JSON.`
            }
          ],
          web_search_options: {},
        }),
      });

      const openaiData = await openaiRes.json();
      if (!openaiRes.ok) {
        throw new Error(openaiData.error?.message || 'OpenAI request failed');
      }

      const rawContent = openaiData.choices?.[0]?.message?.content || '';
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in OpenAI response');
      const result = JSON.parse(jsonMatch[0]);

      return Response.json({ appraisal: result });
    }

    return Response.json({ error: 'Invalid phase. Use "identify" or "appraise".' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});