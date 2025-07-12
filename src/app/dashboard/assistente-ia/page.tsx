
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Send, Loader2, Bot, User, PlusCircle, MessageSquare, Paperclip, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { conversationalAgent, generateConvoTitle as generateTitleAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
}

interface Conversation {
    id: string;
    title: string;
    messages: Message[];
}

const STORAGE_KEY = 'actnexus_ia_conversations';

const readFileAsDataURI = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function AssistenteIaPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const storedConversations = localStorage.getItem(STORAGE_KEY);
      if (storedConversations) {
        setConversations(JSON.parse(storedConversations));
      } else {
        startNewConversation();
      }
    } catch (error) {
      console.error("Failed to load conversations from localStorage", error);
    }
  }, []);

  useEffect(() => {
    if (conversations.length > 0) {
      if (!activeConversationId || !conversations.find(c => c.id === activeConversationId)) {
        setActiveConversationId(conversations[0].id);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
      } catch (error) {
        console.error("Failed to save conversations to localStorage", error);
      }
    }
  }, [conversations, activeConversationId]);
  
  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [activeConversationId, conversations]);

  const activeConversation = useMemo(() => {
    return conversations.find(c => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);


  const startNewConversation = () => {
    const newId = `convo-${Date.now()}`;
    const newConversation = { id: newId, title: 'Nova Conversa', messages: [] };
    setConversations(prev => [newConversation, ...prev]);
    setActiveConversationId(newId);
    inputRef.current?.focus();
    setAttachedFile(null);
  };

  const generateTitle = async (convoId: string, userQuery: string, assistantResponse: string) => {
    try {
      const historyForTitle = `Usuário: ${userQuery}\nAssistente: ${assistantResponse}`;
      const result = await generateTitleAction({ conversationHistory: historyForTitle });
      
      setConversations(prev =>
        prev.map(c =>
          c.id === convoId ? { ...c, title: result.title } : c
        )
      );

    } catch (error) {
        console.error("Failed to generate conversation title:", error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
    }
    e.target.value = ''; // Reset input to allow selecting the same file again
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading || !activeConversationId) return;

    const userMessage: Message = { 
      role: 'user', 
      content: query,
      ...(attachedFile && { fileName: attachedFile.name }),
    };
    const isFirstMessage = activeConversation?.messages.length === 0;

    setConversations(prev =>
        prev.map(convo => {
            if (convo.id === activeConversationId) {
                return {
                    ...convo,
                    title: isFirstMessage ? (query.length > 40 ? query.substring(0, 40) + '...' : query) : convo.title,
                    messages: [...convo.messages, userMessage],
                };
            }
            return convo;
        })
    );

    const currentQuery = query;
    const currentFile = attachedFile;
    setQuery("");
    setAttachedFile(null);
    setIsLoading(true);
    
    try {
      let fileDataUri: string | undefined = undefined;
      if (currentFile) {
        fileDataUri = await readFileAsDataURI(currentFile);
      }

      const result = await conversationalAgent({ query: currentQuery, fileDataUri });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
       
       setConversations(prev =>
        prev.map(convo =>
          convo.id === activeConversationId
            ? { ...convo, messages: [...convo.messages, assistantMessage] }
            : convo
        )
      );
      
      if (isFirstMessage) {
        generateTitle(activeConversationId, currentQuery, result.response);
      }

    } catch (error) {
      console.error("A pesquisa do agente falhou:", error);
      const errorMessage: Message = { role: 'assistant', content: "Desculpe, ocorreu um erro ao processar sua solicitação." };
      setConversations(prev =>
        prev.map(convo =>
          convo.id === activeConversationId
            ? { ...convo, messages: [...convo.messages, errorMessage] }
            : convo
        )
      );
      toast({
        variant: "destructive",
        title: "Falha na Pesquisa",
        description: "Não foi possível obter os resultados da pesquisa. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="flex h-[calc(100vh-6rem)]">
        {/* Sidebar de Conversas */}
        <div className="w-1/4 min-w-[250px] max-w-[350px] bg-muted/50 border-r flex flex-col">
            <div className="p-4 flex-shrink-0">
                <Button onClick={startNewConversation} className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Nova Conversa
                </Button>
            </div>
            <ScrollArea className="flex-1">
                <div className="p-4 pt-0 space-y-2">
                    {conversations.map(convo => (
                        <button
                            key={convo.id}
                            onClick={() => setActiveConversationId(convo.id)}
                            className={cn(
                                "w-full text-left p-2 rounded-md truncate text-sm flex items-center gap-2",
                                activeConversationId === convo.id 
                                    ? "bg-primary text-primary-foreground" 
                                    : "hover:bg-accent"
                            )}
                        >
                            <MessageSquare className="h-4 w-4 flex-shrink-0"/>
                            <span className="truncate flex-1">{convo.title}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>

        {/* Área Principal do Chat */}
        <div className="flex flex-col flex-1 bg-background">
            <div className="p-4 border-b">
                <h1 className="font-headline text-2xl font-bold tracking-tight truncate">{activeConversation?.title || 'Assistente de IA'}</h1>
                <p className="text-muted-foreground text-sm">Converse com o agente para obter informações sobre os dados do cartório.</p>
            </div>
            
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
                    <div className="space-y-6 max-w-4xl mx-auto">
                        {!activeConversation || activeConversation.messages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                                <Bot className="h-12 w-12 mb-4 text-primary" />
                                <h2 className="text-xl font-semibold">Como posso ajudar hoje?</h2>
                                <p className="text-sm">Faça perguntas sobre livros, atos, clientes ou anexe um arquivo para análise.</p>
                                <p className="text-sm mt-4 p-2 bg-muted rounded-md">Exemplo: <span className="font-semibold">"Quais atos o João Santos realizou em 2025?"</span></p>
                            </div>
                        ) : (
                            activeConversation.messages.map((message, index) => (
                                <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                                    {message.role === 'assistant' && (
                                        <Avatar className="h-9 w-9 border bg-primary text-primary-foreground">
                                            <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={`rounded-lg px-4 py-3 max-w-2xl shadow-sm space-y-2 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card border'}`}>
                                        {message.fileName && (
                                          <Badge variant="secondary" className="gap-2">
                                            <Paperclip className="h-3 w-3" />
                                            {message.fileName}
                                          </Badge>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                    {message.role === 'user' && (
                                        <Avatar className="h-9 w-9 border">
                                            <AvatarFallback><User className="h-5 w-5"/></AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex items-start gap-4">
                                <Avatar className="h-9 w-9 border bg-primary text-primary-foreground">
                                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                                <div className="rounded-lg px-4 py-3 bg-card border shadow-sm flex items-center">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="border-t p-4 bg-card-muted/50">
                    <form onSubmit={handleSearch} className="max-w-4xl mx-auto space-y-3">
                         {attachedFile && (
                            <div className="flex items-center">
                              <Badge variant="outline" className="gap-2 p-2">
                                <Paperclip className="h-4 w-4" />
                                <span className="truncate max-w-xs">{attachedFile.name}</span>
                                <button type="button" onClick={() => setAttachedFile(null)} className="ml-2 rounded-full hover:bg-muted p-0.5">
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            </div>
                          )}
                        <div className="flex gap-4">
                            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf" />
                            <Button type="button" variant="outline" size="icon" className="h-12 w-12 flex-shrink-0" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip className="h-5 w-5"/>
                                <span className="sr-only">Anexar Arquivo</span>
                            </Button>
                            <Input
                                ref={inputRef}
                                placeholder="Pergunte ao assistente..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                disabled={isLoading}
                                className="text-base md:text-sm h-12"
                            />
                            <Button type="submit" disabled={isLoading || !query.trim()} size="lg">
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                                <span className="sr-only">Enviar</span>
                            </Button>
                        </div>
                    </form>
                </div>
        </div>
    </div>
  );
}
