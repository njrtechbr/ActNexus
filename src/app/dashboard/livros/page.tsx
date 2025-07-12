
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getLivros, type Livro } from '@/services/apiClientLocal';
import { populateInitialData } from '@/data/initial-data';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Upload } from 'lucide-react';
import Loading from '../loading';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LivroUpload } from '@/components/dashboard/livro-upload';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Link from 'next/link';

export default function LivrosPage() {
    const [livros, setLivros] = useState<Livro[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    const loadLivros = useCallback(async () => {
        setIsLoading(true);
        try {
            populateInitialData();
            const data = await getLivros();
            setLivros(data);
        } catch (error) {
            console.error("Falha ao buscar livros:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar',
                description: 'Não foi possível buscar a lista de livros.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        loadLivros();
    }, [loadLivros]);

    const handleLivroProcessed = () => {
        toast({
            title: 'Sucesso!',
            description: 'Novo livro e seus atos foram cadastrados.',
        });
        loadLivros();
    }

    const getStatusVariant = (status: string) => {
      switch (status) {
        case 'Concluído':
          return 'default';
        case 'Processando':
          return 'secondary';
        case 'Arquivado':
          return 'outline';
        default:
          return 'default';
      }
    };

    const livrosAgrupados = useMemo(() => {
        return livros.reduce((acc, livro) => {
            const tipo = livro.tipo || 'Sem Tipo';
            if (!acc[tipo]) {
                acc[tipo] = [];
            }
            acc[tipo].push(livro);
            return acc;
        }, {} as Record<string, Livro[]>);
    }, [livros]);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight">Acervo de Livros</h1>
                        <p className="text-muted-foreground">
                            Visualize os livros e seus respectivos atos notariais. Total de {livros.length} livros.
                        </p>
                    </div>
                     <Button asChild>
                        <Link href="/dashboard/livros/envio-em-lote">
                            <Upload className="mr-2 h-4 w-4" />
                            Envio em Lote
                        </Link>
                    </Button>
                </div>

                {Object.keys(livrosAgrupados).length > 0 ? (
                    <Accordion type="multiple" defaultValue={Object.keys(livrosAgrupados)} className="w-full space-y-2">
                        {Object.entries(livrosAgrupados).map(([tipo, livrosDoTipo]) => (
                            <AccordionItem key={tipo} value={tipo} className="border-b-0 rounded-lg border bg-card text-card-foreground shadow-sm">
                                <AccordionTrigger className="px-6 py-4 text-lg font-semibold hover:no-underline">
                                    <div className="flex items-center gap-4">
                                        <span>{tipo}</span>
                                        <Badge variant="secondary">{livrosDoTipo.length} livros</Badge>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="px-6 pb-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[100px]">Número</TableHead>
                                                    <TableHead className="w-[100px]">Ano</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="text-right">Total de Folhas</TableHead>
                                                    <TableHead className="w-[100px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {livrosDoTipo.map((livro) => (
                                                    <TableRow key={livro.id}>
                                                        <TableCell className="font-medium">{livro.numero.toString().padStart(3, '0')}</TableCell>
                                                        <TableCell>{livro.ano}</TableCell>
                                                        <TableCell>
                                                            <Badge variant={getStatusVariant(livro.status) as any}>{livro.status}</Badge>
                                                        </TableCell>
                                                        <TableCell className="text-right">{livro.totalAtos}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/livros/${livro.id}`)}>
                                                                <Eye className="h-4 w-4" />
                                                                <span className="sr-only">Visualizar</span>
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <Card>
                        <CardContent className="p-10 text-center text-muted-foreground">
                            Nenhum livro encontrado. Cadastre um novo livro via PDF.
                        </CardContent>
                    </Card>
                )}
            </div>
            <div className="lg:col-span-1">
                 <div className="sticky top-8">
                    <LivroUpload onLivroProcessed={handleLivroProcessed} />
                 </div>
            </div>
        </div>
    );
}
