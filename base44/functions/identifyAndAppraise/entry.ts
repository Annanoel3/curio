import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import OpenAI from 'npm:openai';

// Identify phase only — uses gpt-4o (vision, no web search needed)
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

    const body = await req.json();
    const { image_urls, text_query, collection_type, condition_answers, known_size } = body;

    const allImageUrls = image_urls?.length ? image_urls : [];
    if (!allImageUrls.length && !text_query) {
      return Response.json({ error: 'Provide image_urls or text_query' }, { status: 400 });
    }

    const contextLine = collection_type ? `The user collects: ${collection_type}.` : '';
    const knownSizeLine = known_size ? `CONFIRMED SIZE: The user confirmed this item is ${known_size} tall.` : '';
    const answersLine = condition_answers?.length
      ? `Additional details confirmed by the user (treat as ground truth): ${condition_answers.map(a => `${a.question}: ${a.answer}`).join('; ')}.`
      : '';
    const multiImageNote = allImageUrls.length > 1 ? `The user provided ${allImageUrls.length} photos of the same item. Use all images together.` : '';

    const systemPrompt = `You are an expert collectibles identifier. ${contextLine} ${knownSizeLine} ${answersLine} ${multiImageNote}
Identify the EXACT item (brand, model name, year/series, variant). Be specific.
Determine physical_format: one of "blister-carded die-cast", "loose die-cast", "trading card", "action figure in box", "pottery/ceramics", "flatware/cutlery", "other".
Generate 2-3 condition questions that affect resale value. For items made in multiple sizes, ask height FIRST with known options, always include "Other / I'll measure" as last option.
Set confidence to "high" if certain, "low" if only brand/category is clear.
Respond ONLY with valid JSON: {"identified_item":"string","physical_format":"string","confidence":"high|low|unknown","questions":[{"id":"string","question":"string","type":"yesno|choice","options":["string"]}]}`;

    let identifyResult;

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

      // Step 2: web-search refinement
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
          identifyResult = { ...visionResult, ...refined, questions: visionResult.questions };
        } else {
          identifyResult = visionResult;
        }
      } else {
        identifyResult = visionResult;
      }
    } else {
      // Text-only: use gpt-4o-search-preview directly
      const searchRes = await openai.chat.completions.create({
        model: 'gpt-4o-search-preview',
        messages: [{ role: 'user', content: systemPrompt + `\n\nIdentify: "${text_query}". Search the web to confirm the exact model name, series, and year.` }],
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

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});