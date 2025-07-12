
"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { conversationalAgent as agentAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function AssistenteIaPage() {
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
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-background rounded-lg border">
      <div className="p-4 border-b">
         <h1 className="font-headline text-3xl font-bold tracking-tight">Assistente de IA</h1>
         <p className="text-muted-foreground">Converse com o agente para obter informações sobre os dados do cartório.</p>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef as any}>
            <div className="space-y-6 max-w-4xl mx-auto">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <Bot className="h-12 w-12 mb-4 text-primary" />
                        <h2 className="text-xl font-semibold">Como posso ajudar hoje?</h2>
                        <p className="text-sm">Faça perguntas sobre livros, atos e clientes.</p>
                        <p className="text-sm mt-4 p-2 bg-muted rounded-md">Exemplo: <span className="font-semibold">"Quais atos o João Santos realizou em 2025?"</span></p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}>
                            {message.role === 'assistant' && (
                                <Avatar className="h-9 w-9 border bg-primary text-primary-foreground">
                                    <AvatarFallback><Bot className="h-5 w-5"/></AvatarFallback>
                                </Avatar>
                            )}
                             <div className={`rounded-lg px-4 py-3 max-w-2xl shadow-sm ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-card'}`}>
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
                        <div className="rounded-lg px-4 py-3 bg-card shadow-sm flex items-center">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    </div>
                )}
            </div>
        </ScrollArea>

        <div className="border-t p-4 bg-card-muted/50">
            <form onSubmit={handleSearch} className="flex gap-4 max-w-4xl mx-auto">
                <Input
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
            </form>
        </div>
    </div>
  );
}
