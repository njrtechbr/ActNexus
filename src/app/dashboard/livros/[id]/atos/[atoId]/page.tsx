
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getAtoById, getLivroById, type Ato, type Livro } from '@/services/apiClientLocal';
import Loading from '@/app/dashboard/loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { format, parseISO } from 'date-fns';

const MarkdownRenderer = ({ content }: { content: string }) => {
  const isAllUpperCase = (str: string) => str === str.toUpperCase() && str !== str.toLowerCase();

  const blocks = content.split('\n\n');

  return (
    <Card className="bg-muted/50">
      <CardContent className="p-6 font-sans text-sm space-y-4">
        {blocks.map((block, index) => {
          const lines = block.split('\n');
          const firstLine = lines[0];

          // Renderizar títulos (ex: "OBJETO E PODERES:")
          if (lines.length === 1 && isAllUpperCase(firstLine.replace(':', '')) && firstLine.endsWith(':')) {
            return (
              <div key={index}>
                <h3 className="text-base font-semibold tracking-tight text-foreground mb-2 mt-4">{firstLine}</h3>
                <Separator/>
              </div>
            );
          }

          // Renderizar blocos de parágrafo
          return (
            <div key={index} className="space-y-2">
              {lines.map((line, lineIndex) => (
                <p key={lineIndex} className="leading-relaxed text-foreground">
                  {line}
                </p>
              ))}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};


export default function DetalhesAtoPage() {
    const [ato, setAto] = useState<Ato | null>(null);
    const [livro, setLivro] = useState<Livro | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const params = useParams();
    const router = useRouter();

    const atoId = params.atoId as string;
    const livroId = params.id as string;

    useEffect(() => {
        if (!atoId || !livroId) return;

        async function loadData() {
            try {
                const atoData = await getAtoById(atoId);
                if (!atoData) {
                    router.push(`/dashboard/livros/${livroId}`);
                    return;
                }
                const livroData = await getLivroById(atoData.livroId);
                setAto(atoData);
                setLivro(livroData);
            } catch (error) {
                console.error("Falha ao buscar dados do ato:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [atoId, livroId, router]);

    if (isLoading) {
        return <Loading />;
    }

    if (!ato || !livro) {
        return <div className="text-center p-8">Ato ou Livro não encontrado.</div>;
    }

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
            
            <Card>
                <CardHeader>
                    <CardTitle>Conteúdo do Ato</CardTitle>
                    <CardDescription>
                         Este é o conteúdo estruturado que a IA extraiu para esta folha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     {ato.conteudoMarkdown ? (
                        <MarkdownRenderer content={ato.conteudoMarkdown} />
                     ) : (
                        <div className="text-center text-muted-foreground p-8">
                            Este ato não possui conteúdo Markdown para exibição.
                        </div>
                     )}
                </CardContent>
            </Card>

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
                            <div key={index} className="text-sm p-4 rounded-md border bg-background">
                               <p className='text-foreground'>{av.texto}</p>
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
