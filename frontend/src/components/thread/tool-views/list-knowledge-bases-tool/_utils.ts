export interface KnowledgeBase {
  name: string;
  index_name: string;
  description: string;
  search_method: string;
}

export interface ListKnowledgeBasesData {
  message: string;
  knowledge_bases: KnowledgeBase[];
  count: number;
}

export function extractListKnowledgeBasesData(toolResult: any): ListKnowledgeBasesData | null {
  try {
    // Handle different possible formats
    let data = toolResult;
    
    // If it's a ToolResult with output property
    if (toolResult?.output) {
      data = toolResult.output;
    }
    
    // If it's stringified JSON, parse it
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch {
        return null;
      }
    }
    
    // Extract the knowledge bases data
    const message = data?.message || 'Knowledge bases found';
    const knowledge_bases = data?.knowledge_bases || [];
    
    // Validate that we have an array of knowledge bases
    if (!Array.isArray(knowledge_bases)) {
      return null;
    }
    
    // Validate each knowledge base has required fields
    const validKnowledgeBases = knowledge_bases.filter((kb: any) => 
      kb && 
      typeof kb.name === 'string' && 
      typeof kb.index_name === 'string' && 
      typeof kb.description === 'string' &&
      typeof kb.search_method === 'string'
    );
    
    return {
      message,
      knowledge_bases: validKnowledgeBases,
      count: validKnowledgeBases.length
    };
  } catch (error) {
    console.error('Error extracting list knowledge bases data:', error);
    return null;
  }
} 