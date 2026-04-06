/**
 * Question Generator Service
 * 브라우저에서 직접 정적 리소스를 읽고 Gemini API를 호출합니다.
 *
 * 목표:
 * - 백엔드 없이 동작
 * - 토큰 사용량 최소화
 * - 생성 -> 경량 검수 -> 실패 문항만 재생성
 * - JSON substring 파싱 제거
 */

const DEFAULT_MODEL = 'gemini-1.5-flash';
const REVIEW_MODEL = 'gemini-1.5-flash';

const MAX_API_RETRY = 2;
const MAX_REGENERATE_ROUND = 1;

const API_VERSION = 'v1beta';
const GEMINI_BASE_URL = `https://generativelanguage.googleapis.com/${API_VERSION}`;

const QUESTION_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          question: { type: 'string' },
          options: {
            type: 'array',
            items: { type: 'string' },
            minItems: 4,
            maxItems: 4
          },
          answer: { type: 'integer' },
          explanation: { type: 'string' },
          evidence: { type: 'string' }
        },
        required: ['type', 'question', 'options', 'answer', 'explanation', 'evidence']
      }
    }
  },
  required: ['questions']
};

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    results: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer' },
          valid: { type: 'boolean' },
          issues: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['index', 'valid', 'issues']
      }
    }
  },
  required: ['results']
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getCleanApiKey = (apiKey) => {
  const cleanApiKey = apiKey?.trim();
  if (!cleanApiKey) {
    throw new Error('API Key가 필요합니다. 설정 메뉴에서 입력해 주세요.');
  }
  return cleanApiKey;
};

const fetchTextFile = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error(`${path} 파일을 불러올 수 없습니다.`);
  }
  return response.text();
};

const safeParseJson = (text) => {
  if (typeof text !== 'string') {
    throw new Error('AI 응답이 문자열이 아닙니다.');
  }

  const cleaned = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  return JSON.parse(cleaned);
};

const normalizeQuestion = (question) => {
  if (!question || typeof question !== 'object') return null;
  if (!Array.isArray(question.options) || question.options.length !== 4) return null;

  const answer = Number(question.answer);
  if (!Number.isInteger(answer) || answer < 1 || answer > 4) return null;

  return {
    type: String(question.type || '').trim(),
    question: String(question.question || '').trim(),
    options: question.options.map((opt) => String(opt).trim()),
    answer,
    explanation: String(question.explanation || '').trim(),
    evidence: String(question.evidence || '').trim()
  };
};

const sanitizeQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions
    .map(normalizeQuestion)
    .filter(Boolean)
    .filter((q) =>
      q.type &&
      q.question &&
      q.options.every(Boolean) &&
      q.explanation &&
      q.evidence
    );
};

const extractTextFromGeminiResponse = async (response) => {
  const data = await response.json();

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('')
    .trim();

  if (!text) {
    throw new Error('AI가 응답을 생성하지 못했습니다. (빈 응답 또는 Safety Filter)');
  }

  return text;
};

const callGeminiJson = async ({
  apiKey,
  model,
  prompt,
  schema,
  temperature = 0.3,
  retryCount = 0
}) => {
  if (retryCount > MAX_API_RETRY) {
    throw new Error('최대 재시도 횟수를 초과했습니다.');
  }

  const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature,
      responseMimeType: 'application/json',
      responseSchema: schema
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let errorMessage = `AI API 호출 실패 (${response.status})`;

    try {
      const errorData = await response.json();
      errorMessage = errorData?.error?.message || errorMessage;
    } catch {
      // ignore
    }

    // 429 / 5xx만 짧게 재시도
    if ((response.status === 429 || response.status >= 500) && retryCount < MAX_API_RETRY) {
      await sleep(700 * (retryCount + 1));
      return callGeminiJson({
        apiKey,
        model,
        prompt,
        schema,
        temperature,
        retryCount: retryCount + 1
      });
    }

    throw new Error(errorMessage);
  }

  const text = await extractTextFromGeminiResponse(response);

  try {
    return safeParseJson(text);
  } catch (error) {
    throw new Error(`JSON 파싱 실패: ${error.message}`);
  }
};

const buildGeneratePrompt = ({ basePrompt, passage, settings }) => {
  return `
${basePrompt}

[PASSAGE]
${passage}

[SETTINGS]
difficulty: ${settings.difficulty}
types: ${settings.selectedTypes.join(', ')}
countPerType: ${settings.countPerType}

[RULES]
- Return JSON only.
- Each question must have exactly one correct answer.
- Each question must have exactly 4 options.
- answer must be an integer from 1 to 4.
- Include short explanation.
- Include one short evidence sentence based only on the passage.
- Do not add any text outside JSON.
`.trim();
};

const buildReviewPrompt = ({ passage, questions }) => {
  return `
You are an English test reviewer.

Review each question against the passage.

Check only these:
1. Is there exactly one correct answer?
2. Is the answer supported by the passage?
3. Are there any ambiguous or overlapping options?
4. Does the explanation match the answer?

Return JSON only.

[PASSAGE]
${passage}

[QUESTIONS]
${JSON.stringify(questions)}
`.trim();
};

const buildRegeneratePrompt = ({ passage, settings, invalidItems }) => {
  return `
You are an English test item writer.

Regenerate only the invalid questions based on the passage and the failure reasons.

[PASSAGE]
${passage}

[SETTINGS]
difficulty: ${settings.difficulty}

[INVALID_ITEMS]
${JSON.stringify(invalidItems)}

[RULES]
- Return JSON only.
- Keep the same question type for each regenerated item.
- Each question must have exactly 4 options.
- Exactly one correct answer.
- answer must be an integer from 1 to 4.
- Include short explanation.
- Include one short evidence sentence.
- Fix the reported issues.
`.trim();
};

const generateDraftQuestions = async ({ passage, settings, apiKey, model }) => {
  const basePrompt = await fetchTextFile('prompts/base_prompt.md');

  const prompt = buildGeneratePrompt({
    basePrompt,
    passage,
    settings
  });

  const result = await callGeminiJson({
    apiKey,
    model,
    prompt,
    schema: QUESTION_SCHEMA,
    temperature: 0.4
  });

  const questions = sanitizeQuestions(result?.questions);

  if (!questions.length) {
    throw new Error('생성된 문제를 해석하지 못했습니다.');
  }

  return questions;
};

const reviewQuestions = async ({ passage, questions, apiKey, model }) => {
  const prompt = buildReviewPrompt({
    passage,
    questions
  });

  const result = await callGeminiJson({
    apiKey,
    model,
    prompt,
    schema: REVIEW_SCHEMA,
    temperature: 0.1
  });

  return Array.isArray(result?.results) ? result.results : [];
};

const regenerateInvalidQuestions = async ({
  passage,
  settings,
  invalidItems,
  apiKey,
  model
}) => {
  const prompt = buildRegeneratePrompt({
    passage,
    settings,
    invalidItems
  });

  const result = await callGeminiJson({
    apiKey,
    model,
    prompt,
    schema: QUESTION_SCHEMA,
    temperature: 0.4
  });

  return sanitizeQuestions(result?.questions);
};

const splitValidAndInvalid = (questions, reviewResults) => {
  const validQuestions = [];
  const invalidItems = [];

  questions.forEach((question, index) => {
    const matched =
      reviewResults.find((item) => item.index === index) ||
      reviewResults.find((item) => item.index === index + 1);

    if (!matched || matched.valid) {
      validQuestions.push(question);
      return;
    }

    invalidItems.push({
      index,
      type: question.type,
      question,
      issues: matched.issues || []
    });
  });

  return { validQuestions, invalidItems };
};

export const generateQuestions = async (
  passage,
  settings,
  apiKey,
  model = DEFAULT_MODEL
) => {
  console.log(`Static Flow: Requesting ${model}`);

  const cleanApiKey = getCleanApiKey(apiKey);

  if (!passage?.trim()) {
    throw new Error('본문이 비어 있습니다.');
  }

  if (!settings?.selectedTypes?.length) {
    throw new Error('문제 유형을 하나 이상 선택해 주세요.');
  }

  if (!settings?.countPerType || settings.countPerType < 1) {
    throw new Error('유형당 문항 수를 확인해 주세요.');
  }

  try {
    // 1차 생성
    const draftQuestions = await generateDraftQuestions({
      passage,
      settings,
      apiKey: cleanApiKey,
      model
    });

    // 2차 경량 검수
    const reviewResults = await reviewQuestions({
      passage,
      questions: draftQuestions,
      apiKey: cleanApiKey,
      model: REVIEW_MODEL
    });

    const { validQuestions, invalidItems } = splitValidAndInvalid(
      draftQuestions,
      reviewResults
    );

    // 모두 통과
    if (!invalidItems.length) {
      return draftQuestions;
    }

    // 실패 문항만 1회 재생성
    let regeneratedQuestions = [];
    for (let round = 0; round < MAX_REGENERATE_ROUND; round += 1) {
      regeneratedQuestions = await regenerateInvalidQuestions({
        passage,
        settings,
        invalidItems,
        apiKey: cleanApiKey,
        model
      });

      if (regeneratedQuestions.length > 0) break;
    }

    // 재생성 실패 시라도 유효 문항은 반환
    return [...validQuestions, ...regeneratedQuestions];
  } catch (error) {
    console.error('Generation Error:', error);
    throw error;
  }
};