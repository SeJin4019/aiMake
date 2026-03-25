/**
 * Question Generator Service
 * 브라우저에서 직접 정적 리소스를 읽고 AI API(Gemini 등)를 호출합니다.
 */

// 사용자 설정을 통해 API Key를 관리할 수 있습니다.
// retryCount: 무한 루프 방지를 위한 재시도 횟수 제한
export const generateQuestions = async (passage, settings, apiKey, model = 'gemini-1.5-flash', retryCount = 0) => {
  // 잘못된 모델명(예: 2.5)이 들어올 경우를 대비한 강제 교정
  console.log(`Static Flow: Requesting ${model} (Retry: ${retryCount})`);
  
  if (retryCount > 2) {
    throw new Error('최대 재시도 횟수를 초과했습니다. API Key 권한이나 모델 설정을 확인해 주세요.');
  }

  try {
    // 1. 공용 리소스 읽기 (public 폴더)
    const [basePromptRes, formatTemplateRes] = await Promise.all([
      fetch('prompts/base_prompt.md'),
      fetch('templates/question_format.json')
    ]);
    
    if (!basePromptRes.ok || !formatTemplateRes.ok) {
      throw new Error('프롬프트 또는 템플릿 파일을 불러올 수 없습니다. public 폴더를 확인해 주세요.');
    }

    const basePrompt = await basePromptRes.text();
    const formatTemplate = await formatTemplateRes.text();

    const cleanApiKey = apiKey?.trim();
    if (!cleanApiKey) {
      throw new Error('API Key가 필요합니다. 설정 메뉴에서 입력해 주세요.');
    }

    const payload = {
      contents: [{
        parts: [{
          text: `${basePrompt}\n\nPassage: "${passage}"\nDifficulty: ${settings.difficulty}\nTypes: ${settings.selectedTypes.join(', ')}\nCount: ${settings.countPerType}\n\nResponse Format (must be JSON):\n${formatTemplate}`
        }]
      }]
    };

    // v1 과 v1beta 모두 시도하기 위해 API 버전을 동적으로 결정할 수 있지만, 기본 v1beta 사용
    const API_VERSION = (model === 'gemini-1.5-flash' || model === 'gemini-1.5-pro') ? 'v1beta' : 'v1beta';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/${API_VERSION}/models/${model}:generateContent?key=${cleanApiKey}`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      
      // 404 에러인 경우 자동 모델 검색 시도
      if (response.status === 404 && retryCount === 0) {
        console.warn('Model not found. Discovering available models via v1 and v1beta...');
        try {
          const [v1Res, v1betaRes] = await Promise.all([
            fetch(`https://generativelanguage.googleapis.com/v1/models?key=${cleanApiKey}`),
            fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanApiKey}`)
          ]);
          
          const v1Data = await v1Res.json();
          const v1betaData = await v1betaRes.json();
          
          const availableModels = [
            ...(v1Data.models || []),
            ...(v1betaData.models || [])
          ];

          console.log('Available Models for this Key:', availableModels.map(m => m.name));

          // 사용 가능한 모델 중 하나 선택 (flash 우선, 그 다음 pro)
          // 사용자님의 리스트를 기반으로 가장 적합한 모델 후보군
          const candidates = [
            'gemini-2.5-flash', 
            'gemini-2.0-flash', 
            'gemini-flash-latest', 
            'gemini-1.5-flash', 
            'gemini-pro-latest', 
            'gemini-pro'
          ];
          
          let foundShortName = null;
          for (const cand of candidates) {
            if (availableModels.some(m => m.name.endsWith(cand))) {
              foundShortName = cand;
              break;
            }
          }

          if (foundShortName) {
            console.log(`Automatic Fallback: Using discovered model ${foundShortName}`);
            return generateQuestions(passage, settings, apiKey, foundShortName, retryCount + 1);
          }
        } catch (e) {
          console.error('Model discovery failed:', e);
        }
      }

      // 429 에러(Rate Limit) 또는 기타 에러 발생 시 pro 모델로 마지막 시도
      if (response.status !== 404 && model !== 'gemini-pro' && retryCount < 1) {
        return generateQuestions(passage, settings, apiKey, 'gemini-pro', retryCount + 1);
      }

      throw new Error(errorData.error?.message || `AI API 호출 실패 (${response.status})`);
    }

    const data = await response.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('AI가 응답을 생성하지 못했습니다. (Safety Filter 등)');
    }

    const resultText = data.candidates[0].content.parts[0].text;
    const jsonStr = resultText.substring(resultText.indexOf('{'), resultText.lastIndexOf('}') + 1);
    return JSON.parse(jsonStr).questions || [];

  } catch (error) {
    console.error('Generation Error:', error);
    throw error;
  }
};
