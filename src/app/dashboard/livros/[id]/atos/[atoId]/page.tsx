
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAtoById, getLivroById, updateAto, type Ato, type Livro, getClienteByNome, updateCliente } from '@/services/apiClientLocal';
import { extractActDetails, type ExtractActDetailsOutput } from '@/lib/actions';
import Loading from '@/app/dashboard/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, User, Users, Sparkles, Loader2, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';


const MarkdownRenderer = ({ content }: { content: string }) => {
  if (!content) {
    return null;
  }

  const blocks = content.split('\n\n');

  return (
    <div className="font-serif text-base text-justify space-y-4 text-foreground/90">
      {blocks.map((block, index) => {
        const trimmedBlock = block.trim();
        if (!trimmedBlock) return null;

        const lines = trimmedBlock.split('\n');
        
        if (trimmedBlock.startsWith('_________________________________________')) {
            return (
              <div key={index} className="text-center pt-8">
                  {lines.map((line, lineIndex) => <p key={lineIndex}>{line}</p>)}
              </div>
            );
        }
        
        if (lines.length === 1 && trimmedBlock === trimmedBlock.toUpperCase() && trimmedBlock.endsWith(':')) {
          return (
            <div key={index}>
              <h3 className="text-sm font-sans font-bold tracking-wider text-foreground mb-2 mt-4 text-left uppercase">{trimmedBlock.slice(0, -1)}</h3>
              <Separator/>
            </div>
          );
        }

        return (
           <p key={index} className="leading-relaxed indent-8 text-justify">
              {trimmedBlock}
          </p>
        );
      })}
    </div>
  );
};


export default function DetalhesAtoPage() {
    const [ato, setAto] = useState<Ato | null>(null);
    const [livro, setLivro] = useState<Livro | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [extractedDetails, setExtractedDetails] = useState<ExtractActDetailsOutput['details'] | null>(null);
    const [isExtracting, setIsExtracting] = useState(false);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();

    const atoId = params.atoId as string;
    const livroId = params.id as string;

    const runAndSaveExtraction = useCallback(async (currentAto: Ato) => {
        if (!currentAto.conteudoMarkdown || currentAto.dadosExtraidos) return;

        setIsExtracting(true);
        try {
            const result = await extractActDetails({ actContent: currentAto.conteudoMarkdown });
            if (result.details) {
                setExtractedDetails(result.details);
                // Salva os detalhes extraídos no "banco de dados"
                await updateAto(currentAto.id, { dadosExtraidos: result.details });
            }
        } catch (error) {
            console.error("Falha ao extrair e salvar detalhes do ato:", error);
        } finally {
            setIsExtracting(false);
        }

    }, []);

    const handleSaveField = async (label: string, value: string) => {
        if (!ato) return;

        // Simplificação: Assume que a primeira parte é o cliente principal para salvar o campo.
        const nomePartePrincipal = ato.partes[0];
        if (!nomePartePrincipal) {
            toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível identificar a parte principal do ato.'});
            return;
        }

        try {
            const cliente = await getClienteByNome(nomePartePrincipal);
            if (!cliente) {
                toast({ variant: 'destructive', title: 'Cliente não encontrado', description: `Não foi possível encontrar um cliente com o nome "${nomePartePrincipal}".`});
                return;
            }

            await updateCliente(cliente.id, { label, value });

            toast({
                title: 'Campo Salvo!',
                description: `O campo "${label}" foi salvo no perfil de ${cliente.nome}.`,
            });

        } catch (error) {
            console.error('Falha ao salvar campo para cliente:', error);
            toast({ variant: 'destructive', title: 'Erro ao Salvar', description: 'Não foi possível salvar o campo no perfil do cliente.'});
        }
    };

    useEffect(() => {
        if (!atoId || !livroId) return;

        async function loadData() {
            setIsLoading(true);
            try {
                const atoData = await getAtoById(atoId);
                if (!atoData) {
                    router.push(`/dashboard/livros/${livroId}`);
                    return;
                }
                const livroData = await getLivroById(atoData.livroId);
                setAto(atoData);
                setLivro(livroData);

                if (atoData.dadosExtraidos) {
                    setExtractedDetails(atoData.dadosExtraidos);
                } else if (atoData.conteudoMarkdown) {
                    // Executa a extração em segundo plano
                    runAndSaveExtraction(atoData);
                }

            } catch (error) {
                console.error("Falha ao buscar dados do ato:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [atoId, livroId, router, runAndSaveExtraction]);

    if (isLoading) {
        return <Loading />;
    }

    if (!ato || !livro) {
        return <div className="text-center p-8">Ato ou Livro não encontrado.</div>;
    }

    const showExtractionLoader = isExtracting || (!extractedDetails && !!ato.conteudoMarkdown);

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar para o Livro</span>
                    </Button>
                    <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight">
                            Folha {ato.numeroAto.toString().padStart(3, '0')} - {ato.tipoAto}
                        </h1>
                        <Button variant="link" className="p-0 h-auto text-base text-muted-foreground" onClick={() => router.push(`/dashboard/livros/${livro.id}`)}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Livro {livro.numero.toString().padStart(3, '0')}/{livro.ano}
                        </Button>
                    </div>
                 </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                             <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <Sparkles className="h-5 w-5 text-primary"/>
                                    Detalhes do Ato
                                </CardTitle>
                                {showExtractionLoader && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
                             </div>
                            <CardDescription>Dados extraídos pela IA do conteúdo.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3 text-sm">
                            <div className="flex justify-between border-b pb-2">
                                <span className="font-medium text-muted-foreground">Escrevente</span>
                                <span className="font-semibold text-right text-foreground">{ato.escrevente || 'Não informado'}</span>
                            </div>
                            {showExtractionLoader && (
                                <div className="space-y-3 pt-1">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-4/5" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            )}
                            {extractedDetails?.map(item => (
                                <div key={item.label} className="flex flex-col gap-1 border-b pb-2 group">
                                    <span className="font-medium text-muted-foreground">{item.label}</span>
                                    <div className="flex justify-between items-center">
                                        <span className="font-semibold text-right text-foreground">{item.value}</span>
                                        <Button 
                                            size="icon" 
                                            variant="ghost" 
                                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => handleSaveField(item.label, item.value)}
                                            title={`Salvar "${item.label}" no cadastro do cliente`}
                                        >
                                            <Save className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5"/>
                                Partes Envolvidas
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                           {ato.partes.map((parte, index) => (
                                <div key={index} className="flex items-center gap-3">
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <span className="font-medium">{parte}</span>
                                </div>
                           ))}
                        </CardContent>
                    </Card>
                </div>
                
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Conteúdo do Ato</CardTitle>
                            <CardDescription>
                                Este é o conteúdo que a IA extraiu para esta folha.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                             {ato.conteudoMarkdown ? (
                                <div className="p-4 border rounded-md bg-muted/30">
                                    <MarkdownRenderer content={ato.conteudoMarkdown} />
                                </div>
                             ) : (
                                <div className="text-center text-muted-foreground p-8">
                                    Este ato não possui conteúdo Markdown para exibição.
                                </div>
                             )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {ato.averbacoes && ato.averbacoes.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Averbações Registradas</CardTitle>
                        <CardDescription>
                            Modificações e observações adicionadas a esta folha.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {ato.averbacoes.map((av, index) => (
                            <div key={index} className="text-sm p-4 rounded-md border bg-background relative">
                               <Badge variant="secondary" className="absolute -top-2 left-4">AV.{index + 1}</Badge>
                               <p className='text-foreground pt-2'>{av.texto}</p>
                               <div className="flex justify-between text-xs text-muted-foreground mt-3 pt-3 border-t">
                                 <span>Data do Fato: {av.dataAverbacao ? format(parseISO(av.dataAverbacao), 'dd/MM/yyyy') : 'N/A'}</span>
                                 <span>Registro: {av.dataRegistro ? format(parseISO(av.dataRegistro), "dd/MM/yyyy 'às' HH:mm") : 'N/A'}</span>
                               </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
