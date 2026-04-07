import domo from 'ryuu.js';

export interface SearchMatch {
  metadata: {
    path: string;
  };
  content: {
    text: string;
  };
}

export interface SearchResult {
  matches: SearchMatch[];
}

export interface AiResponse {
  choices: {
    output: string;
  }[];
}

export const searchDocuments = async (
  query: string,
  fileSetId: string,
  topK: number = 3
): Promise<SearchResult> => {
  const endpoint = `/domo/files/v1/filesets/${fileSetId}/query`;
  const payload = { query, directoryPath: "", topK };
  return await domo.post(endpoint, payload) as any as SearchResult;
};

export const generateAiResponse = async (prompt: string): Promise<string> => {
  const response = await domo.post(`/domo/ai/v1/text/generation`, {
    input: prompt,
  }) as any as AiResponse;
  return response.choices?.[0]?.output || "No response generated.";
};

export const handleRagChat = async (
  userQuery: string,
  fileSetId: string
) => {
  try {
    // 1. Search the fileset
    const searchResult = await searchDocuments(userQuery, fileSetId, 3);

    // 2. Extract document context and sources
    const matches = searchResult.matches || [];
    const sources = Array.from(new Set(matches.map((m) => m.metadata.path)));
    const documentContext = matches
      .map((m) => `[Source: ${m.metadata.path}]\n${m.content.text}`)
      .join('\n\n---\n\n');

    // 3. Build the augmented prompt
    const prompt = `You are a professional National Education Policy (NEP) assistant. Use the following
retrieved documentation to answer the user's question accurately and formally. If the information isn't in the documentation, state that clearly but provide relevant context from the policy if possible.

DOCUMENTATION: ${documentContext}

USER QUESTION: ${userQuery}`;

    // 4. Generate AI response
    const text = await generateAiResponse(prompt);

    return {
      text,
      sources,
    };
  } catch (error) {
    console.error("Error in handleRagChat:", error);
    return {
      text: "Sorry, I encountered an error while processing your request. Please ensure the FileSet ID is correct and accessible.",
      sources: [],
    };
  }
};
