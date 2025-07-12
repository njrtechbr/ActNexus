
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { conversationalAgent as agentAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { Avatar, AvatarFallback } from "../ui/avatar";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function ConversationalAgent() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setQuery("");
    setIsLoading(true);
    
    try {
      const result = await agentAction({ query });
      const assistantMessage: Message = { role: 'assistant', content: result.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("A pesquisa do agente falhou:", error);
      const errorMessage: Message = { role: 'assistant', content: "Desculpe, ocorreu um erro ao processar sua solicitação." };
      setMessages(prev => [...prev, errorMessage]);
      toast({
        variant: "destructive",
        title: "Falha na Pesquisa",
        description: "Não foi possível obter os resultados da pesquisa. Por favor, tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Assistente de IA</CardTitle>
        <CardDescription>Converse com o agente para obter informações sobre os dados do cartório.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col flex-1">
        <ScrollArea className="flex-1 mb-4 pr-4 h-[300px]" ref={scrollAreaRef as any}>
            <div className="space-y-4">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
                        <Bot className="h-10 w-10 mb-2" />
                        <p className="font-semibold">Pergunte-me qualquer coisa!</p>
                        <p className="text-sm">Ex: "Quantos atos a Maria Silva possui?"</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'assistant' && (
                                <Avatar className="h-8 w-8 border bg-primary text-primary-foreground">
                                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                            )}
                             <div className={`rounded-lg px-3 py-2 max-w-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            </div>
                        </div>
                    ))
                )}
                 {isLoading && (
                    <div className="flex items-start gap-3">
                         <Avatar className="h-8 w-8 border bg-primary text-primary-foreground">
                            <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                        </Avatar>
                        <div className="rounded-lg px-3 py-2 bg-muted flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>
        <form onSubmit={handleSearch} className="flex gap-2 border-t pt-4">
          <Input
            placeholder="Pergunte ao agente..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="text-base md:text-sm"
          />
          <Button type="submit" disabled={isLoading || !query.trim()} size="icon" className="flex-shrink-0">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Enviar</span>
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
