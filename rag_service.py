from typing import List, Dict

class RAGService:
    def __init__(self):
        self.knowledge_base = []
        
    def add_document(self, text: str, metadata: Dict = None):
        """Add a document to the knowledge base"""
        self.knowledge_base.append({
            'text': text,
            'metadata': metadata or {}
        })
    
    def similarity_search(self, query: str, top_k: int = 3) -> List[Dict]:
        """Find documents containing query keywords"""
        if not self.knowledge_base:
            return []
            
        query_words = query.lower().split()
        scored_docs = []
        
        for doc in self.knowledge_base:
            score = sum(1 for word in query_words if word in doc['text'].lower())
            if score > 0:
                scored_docs.append((score, doc))
        
        scored_docs.sort(key=lambda x: x[0], reverse=True)
        return [doc for _, doc in scored_docs[:top_k]]
    
    def get_context(self, query: str, top_k: int = 3) -> str:
        """Get relevant context for query"""
        relevant_docs = self.similarity_search(query, top_k)
        context = "\n\n".join([doc['text'] for doc in relevant_docs])
        return context

# Global RAG instance
rag_service = RAGService()