import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// phase=identify → gpt-4o (vision, no web search needed — fast)
// phase=appraise → gpt-4o-search-preview (web search for real market prices)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const body = await req.json();
    const { phase, image_urls, text_query, collection_type, condition_answers, identified_item, known_size, user_notes } = body;

    const allImageUrls = image_urls?.length ? image_urls : [];
    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const knownSizeLine = known_size ? `CONFIRMED SIZE: The user confirmed this item is ${known_size} tall.` : '';
    const multiImageNote = allImageUrls.length > 1 ? `The user provided ${allImageUrls.length} photos of the same item. Use all images together.` : '';

    // ── PHASE: IDENTIFY ──────────────────────────────────────────────────
    if (phase === 'identify') {
      if (!allImageUrls.length && !text_query) {
        return Response.json({ error: 'Provide image_urls or text_query' }, { status: 400 });
      }

      const userNotesLine = user_notes ? `\nIMPORTANT — User-provided details (treat as confirmed ground truth): "${user_notes}"` : '';

      const visionPrompt = allImageUrls.length
        ? `You are an expert collectibles identifier with deep knowledge of antiques, flatware, ceramics, die-cast, and collectibles.
${contextLine} ${knownSizeLine} ${multiImageNote}${userNotesLine}

Your job is to produce a DETAILED VISUAL DESCRIPTION of this item so a web search can find the exact match. Do NOT guess a model name — describe what you literally see.

Describe in detail:
1. Overall shape and body style (e.g. VW microbus, muscle car, pickup truck, fork with N tines, ceramic vase with handles, etc.)
2. Color(s) — be specific (magenta/hot pink, metallic blue, etc.)
3. Any markings, logos, text, or tampos visible
4. Wheel type if applicable (redline, blackwall, Real Riders, etc.)
5. Surfboards, accessories, or unusual features attached
6. Packaging if present (blister card, box, loose)
7. Approximate era/decade based on style
8. Any other distinctive features

Also output your best guess at the item identity (brand, model, year) and a physical_format.

Respond ONLY with valid JSON: {"visual_description":"string","best_guess":"string","physical_format":"string"}`
        : null;

      const textPrompt = !allImageUrls.length
        ? `You are an expert collectibles identifier. ${contextLine} ${knownSizeLine}${userNotesLine}
The user described: "${text_query}".
CRITICAL: If the description mentions any non-standard physical feature (e.g. "5 tines", "5 prong") — treat as confirmed ground truth and identify AS that specific variant.
1. Identify the EXACT item (brand, model name, year/series, variant).
2. Determine the physical_format.
3. Generate 2-3 condition questions that directly affect resale value. Only ask about size if this exact item was made in multiple sizes with different values.
Set confidence to "high" if certain, "low" if making a general guess.
Respond ONLY with valid JSON: {"identified_item":"string","physical_format":"string","confidence":"high|low|unknown","questions":[{"id":"string","question":"string","type":"yesno|choice","options":["string"]}]}`
        : null;

      let identifyResult;

      if (allImageUrls.length) {
        // Step 1: gpt-4o describes the item visually in detail (no guessing model name)
        const visionRes = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: visionPrompt },
              ...allImageUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'high' } }))
            ]
          }],
          response_format: { type: 'json_object' },
        });
        const visionResult = JSON.parse(visionRes.choices?.[0]?.message?.content || '{}');
        const visualDesc = visionResult.visual_description || '';
        const bestGuess = visionResult.best_guess || '';
        const physicalFormat = visionResult.physical_format || 'other';

        // Step 2: gpt-4o-search-preview uses the rich visual description + best guess to find exact match
        const refineRes = await openai.chat.completions.create({
          model: 'gpt-4o-search-preview',
          messages: [{
            role: 'user',
            content: `You are a world-class collectibles identification expert. ${contextLine}

A visual analysis of a collectible item produced this description:
"${visualDesc}"

The vision model's best guess was: "${bestGuess}"

Using this description, search eBay sold listings, collector databases (hwcollectorsnews.com, redline-hotwheels.com, hobbyDB, Worthpoint), and manufacturer catalogs to find the EXACT match.

CRITICAL RULES:
- The visual description is ground truth — do NOT ignore distinctive features like body shape, color, surfboards, wheel type.
- A pink/magenta VW microbus with surfboards sticking out the rear is a Hot Wheels Beach Bomb — search for it specifically.
- Do NOT assume the most common version. Rare variants (rear-loading vs side-loading, specific colors) can differ in value by 100x.
- If the visual description and best guess conflict, trust the visual description.

Generate 2-3 condition questions that directly affect resale value for this specific item.

Respond ONLY with valid JSON: {"identified_item":"string","physical_format":"string","confidence":"high|low|unknown","questions":[{"id":"string","question":"string","type":"yesno|choice","options":["string"]}]}`
          }],
          web_search_options: {},
        });
        const refineRaw = refineRes.choices?.[0]?.message?.content || '';
        const refineMatch = refineRaw.match(/\{[\s\S]*\}/);
        if (refineMatch) {
          identifyResult = { ...JSON.parse(refineMatch[0]), physical_format: physicalFormat };
        } else {
          identifyResult = { identified_item: bestGuess, physical_format: physicalFormat, confidence: 'low', questions: [] };
        }
      } else {
        // Text-only: use gpt-4o-search-preview directly
        const searchRes = await openai.chat.completions.create({
          model: 'gpt-4o-search-preview',
          messages: [{ role: 'user', content: textPrompt + '\n\nSearch the web to confirm the exact model name, series, and year.' }],
          web_search_options: {},
        });
        const searchRaw = searchRes.choices?.[0]?.message?.content || '';
        const searchMatch = searchRaw.match(/\{[\s\S]*\}/);
        if (!searchMatch) throw new Error('No JSON in identify response');
        identifyResult = JSON.parse(searchMatch[0]);
      }

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

      const appraisePrompt = `You are a specialist collectibles appraiser. ${contextLine} ${answersLine} ${userNotesLine}

Item: "${itemName}"

Search eBay sold listings, Mercari, and StockX (if applicable) for recent actual sold prices of this EXACT item and variant.

TITLE RULES — be specific and collector-grade:
- Include brand/manufacturer, exact series name, exact model name, year, color, and packaging type.
- Example good: "Matchbox Moving Parts 2004 Honda S2000 — White, Blister Carded"
- NEVER use generic words like "Toy Car" or "Collectible" as the only descriptor.

NOTES — write for a collector (under 80 words): mention the specific series, what makes this notable, special features, packaging state if known.

Provide: estimated_value (median sold price), value_low, value_high, title, 3-6 lowercase tags, notes, appraisal_reasoning (1-2 sentences). Adjust all values for the confirmed condition.

Respond ONLY with valid JSON: {"title":"string","tags":["string"],"notes":"string","value_low":0,"value_high":0,"estimated_value":0,"appraisal_reasoning":"string"}`;

      const appraiseRes = await openai.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: appraisePrompt }],
        web_search_options: {},
      });

      const raw = appraiseRes.choices?.[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in OpenAI response');
      const result = JSON.parse(jsonMatch[0]);

      return Response.json({ appraisal: result });
    }

    return Response.json({ error: 'Invalid phase. Use "identify" or "appraise".' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});