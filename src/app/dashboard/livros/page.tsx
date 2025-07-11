
"use client";

import { useState, useEffect, useCallback } from 'react';
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
import { Eye } from 'lucide-react';
import Loading from '../loading';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { LivroUpload } from '@/components/dashboard/livro-upload';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function LivrosPage() {
    const [livros, setLivros] = useState<Livro[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    const loadLivros = useCallback(async () => {
        setIsLoading(true);
        try {
            // Garante que os dados de configuração também sejam populados
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
    
    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight">Acervo de Livros</h1>
                        <p className="text-muted-foreground">
                            Visualize os livros e seus respectivos atos notariais.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Livros Cadastrados</CardTitle>
                        <CardDescription>
                            Total de {livros.length} livros no acervo.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Número</TableHead>
                                        <TableHead className="w-[100px]">Ano</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Total de Folhas</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {livros.length > 0 ? (
                                        livros.map((livro) => (
                                            <TableRow key={livro.id}>
                                                <TableCell className="font-medium">{livro.numero.toString().padStart(3, '0')}</TableCell>
                                                <TableCell>{livro.ano}</TableCell>
                                                <TableCell>{livro.tipo}</TableCell>
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
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Nenhum livro encontrado. Cadastre um novo livro via PDF.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="lg:col-span-1">
                 <div className="sticky top-8">
                    <LivroUpload onLivroProcessed={handleLivroProcessed} />
                 </div>
            </div>
        </div>
    );
}
