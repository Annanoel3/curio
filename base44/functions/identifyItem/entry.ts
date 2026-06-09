import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const body = await req.json();
    const { image_url, image_urls, text_query, collection_type, known_size } = body;

    const allImageUrls = image_urls?.length ? image_urls : (image_url ? [image_url] : []);
    if (!allImageUrls.length && !text_query) {
      return Response.json({ error: 'Provide image_url(s) or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const knownSizeLine = known_size ? `CONFIRMED SIZE: The user confirmed this item is ${known_size} tall. Use this exact size to identify the correct model/variant.` : '';
    const multiImageNote = allImageUrls.length > 1 ? `The user provided ${allImageUrls.length} photos of the same item. Use all images together.` : '';

    const systemPrompt = `You are an expert collectibles identifier with deep knowledge of antiques, flatware, ceramics, die-cast, and collectibles.
${contextLine} ${knownSizeLine} ${multiImageNote}

STEP 1 — MANDATORY PHYSICAL COUNT: Count every countable structural feature. State the exact count explicitly. A standard dinner fork has 4 tines; a 5-tine fork is a rare distinct variant — do NOT assume 4 unless you counted 4.
STEP 2 — VISUAL ANALYSIS: Examine shape, silhouette, decoration, marks/signatures (read ALL text exactly), color, finish, unusual features.
STEP 3 — IDENTIFY the EXACT model/variant. Include brand, exact model name, model number if known, year/series.
STEP 4 — physical_format: one of "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "pottery/ceramics", "flatware/cutlery", "other".
STEP 5 — Generate 2-4 condition questions that affect resale value. For items made in multiple sizes, ask height FIRST with known size options, always include "Other / I'll measure" as last option.
Set confidence to "high" if certain of exact model, "low" if only brand/category is clear, "unknown" if unidentifiable.

Respond ONLY with valid JSON: {"identified_item":"string","physical_format":"string","confidence":"high|low|unknown","questions":[{"id":"string","question":"string","type":"yesno|choice","options":["string"]}]}`;

    let result;

    if (allImageUrls.length) {
      // Step 1: vision identification with gpt-4o
      const visionRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: systemPrompt },
            ...allImageUrls.map(url => ({ type: 'image_url', image_url: { url, detail: 'high' } }))
          ]
        }],
        response_format: { type: 'json_object' },
      });
      const visionResult = JSON.parse(visionRes.choices?.[0]?.message?.content || '{}');

      // Step 2: web-search refinement with gpt-4o-search-preview
      const roughName = visionResult.identified_item || '';
      if (roughName) {
        const refineRes = await openai.chat.completions.create({
          model: 'gpt-4o-search-preview',
          messages: [{
            role: 'user',
            content: `A collectibles expert visually identified an item as: "${roughName}". ${contextLine}
Search the web to confirm or refine the EXACT model name, series, year, color, and variant.
Respond ONLY with valid JSON: {"identified_item":"string","physical_format":"string","confidence":"high|low|unknown"}`
          }],
          web_search_options: {},
        });
        const refineRaw = refineRes.choices?.[0]?.message?.content || '';
        const refineMatch = refineRaw.match(/\{[\s\S]*\}/);
        if (refineMatch) {
          const refined = JSON.parse(refineMatch[0]);
          result = { ...visionResult, ...refined, questions: visionResult.questions };
        } else {
          result = visionResult;
        }
      } else {
        result = visionResult;
      }
    } else {
      // Text-only: use gpt-4o-search-preview directly
      const searchRes = await openai.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: systemPrompt + `\n\nIdentify this item: "${text_query}". Search the web to confirm the exact model name, series, and year.` }],
        web_search_options: {},
      });
      const raw = searchRes.choices?.[0]?.message?.content || '';
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in identify response');
      result = JSON.parse(jsonMatch[0]);
    }

    const identified = result.identified_item || '';
    const format = (result.physical_format || '').toLowerCase();
    const TRADING_CARD_KEYWORDS = ['corner', 'centering', 'holo', 'surface scratch', 'print line', 'psa', 'bgs', 'grading', 'grade', 'edge wear'];
    const isDieCast = format.includes('blister') || format.includes('die-cast') || format.includes('diecast') ||
      identified.toLowerCase().includes('hot wheels') || identified.toLowerCase().includes('matchbox');
    const isCard = format.includes('trading card') || identified.toLowerCase().includes('pokemon card');

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