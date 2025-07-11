
"use client";

import { useState, useEffect, useCallback } from 'react';
import { getAiUsageLogs, type AiUsageLog } from '@/services/apiClientLocal';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Loading from './loading';
import { BrainCircuit, Clock, Braces, Binary, FileInput, FileOutput, CircleDollarSign } from 'lucide-react';

const formatCost = (cost: number) => {
    if (cost < 0.000001) return `< $0.000001`;
    return `$${cost.toFixed(6)}`;
}

const CodeBlock = ({ title, language, code, icon: Icon }: { title: string, language: string, code: string, icon: React.ElementType }) => (
    <div className='space-y-2'>
        <h4 className='flex items-center gap-2 text-sm font-semibold'><Icon className="h-4 w-4"/>{title}</h4>
        <Card className='bg-background/50 font-mono text-xs shadow-inner'>
            <CardContent className='p-4 max-h-60 overflow-y-auto'>
                <pre><code className={`language-${language}`}>{code}</code></pre>
            </CardContent>
        </Card>
    </div>
);

export default function AuditoriaIaPage() {
    const [logs, setLogs] = useState<AiUsageLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const loadLogs = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getAiUsageLogs();
            setLogs(data);
        } catch (error) {
            console.error("Falha ao buscar logs de IA:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao Carregar',
                description: 'Não foi possível buscar os logs de auditoria.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadLogs();
    }, [loadLogs]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Auditoria de Uso de IA</h1>
                <p className="text-muted-foreground">
                    Registros detalhados de cada chamada feita aos modelos de IA. Total de {logs.length} registros.
                </p>
            </div>

            <Card>
                 <CardHeader>
                    <CardTitle>Registros de Atividade</CardTitle>
                    <CardDescription>
                        Clique em um registro para expandir e ver os detalhes completos.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {logs.length > 0 ? (
                        <Accordion type="multiple" className="w-full space-y-2">
                            {logs.map((log) => (
                                <AccordionItem key={log.id} value={log.id} className="border-b-0 rounded-lg border bg-muted/20 hover:bg-muted/50 transition-colors">
                                    <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                                        <div className="flex flex-wrap items-center justify-between w-full gap-x-4 gap-y-2">
                                            <div className='flex items-center gap-3'>
                                                <BrainCircuit className="h-5 w-5 text-primary" />
                                                <div className='text-left'>
                                                    <p>{log.flowName}</p>
                                                    <p className='text-xs font-normal text-muted-foreground'>
                                                        {format(parseISO(log.timestamp), "PPP, HH:mm:ss", { locale: ptBR })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className='flex items-center gap-4'>
                                                <Badge variant="outline" className="text-xs">
                                                    {log.totalTokens} Tokens
                                                </Badge>
                                                <Badge variant="secondary" className="text-xs">
                                                    {formatCost(log.totalCost)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="px-6 pb-4 space-y-4">
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            <div className="flex flex-col gap-1 rounded-md border p-3">
                                                <span className='font-semibold text-muted-foreground flex items-center gap-1.5'><FileOutput className="h-4 w-4"/>Entrada</span>
                                                <span className='font-mono'>{log.inputTokens} tokens</span>
                                                <span className='font-mono text-xs'>{formatCost(log.inputCost)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 rounded-md border p-3">
                                                <span className='font-semibold text-muted-foreground flex items-center gap-1.5'><FileInput className="h-4 w-4"/>Saída</span>
                                                <span className='font-mono'>{log.outputTokens} tokens</span>
                                                <span className='font-mono text-xs'>{formatCost(log.outputCost)}</span>
                                            </div>
                                            <div className="flex flex-col gap-1 rounded-md border p-3">
                                                <span className='font-semibold text-muted-foreground flex items-center gap-1.5'><Clock className="h-4 w-4"/>Latência</span>
                                                <span className='font-mono'>{log.latencyMs} ms</span>
                                            </div>
                                            <div className="flex flex-col gap-1 rounded-md border p-3">
                                                <span className='font-semibold text-muted-foreground flex items-center gap-1.5'><CircleDollarSign className="h-4 w-4"/>Custo Total</span>
                                                <span className='font-mono font-bold'>{formatCost(log.totalCost)}</span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <CodeBlock title="Prompt Enviado" language="json" code={log.prompt} icon={Braces} />
                                            <CodeBlock title="Resposta Recebida" language="json" code={log.response} icon={Binary}/>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-center text-muted-foreground py-10">
                            Nenhum registro de uso de IA encontrado. Use as funcionalidades do sistema para gerar logs.
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
