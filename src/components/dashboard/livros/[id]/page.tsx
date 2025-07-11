
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { getAtosByLivroId, type Ato, getLivroById, type Livro } from '@/services/apiClientLocal';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { ArrowLeft, Search, Calendar, CheckCircle, FileDown, MessageSquareQuote, FileCode } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AtoFormDialog } from '@/components/dashboard/ato-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import { MarkdownViewerDialog } from '@/components/dashboard/markdown-viewer-dialog';

interface UserProfile {
    role: string;
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

export default function DetalhesLivroPage() {
    const [livro, setLivro] = useState<Livro | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [atoToEdit, setAtoToEdit] = useState<Ato | null>(null);
    const [isAtoFormOpen, setIsAtoFormOpen] = useState(false);
    const [isMarkdownViewerOpen, setIsMarkdownViewerOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState<UserProfile | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const livroId = params.id as string;

     useEffect(() => {
        const userData = localStorage.getItem("actnexus_user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const loadData = useCallback(async () => {
        if (!livroId) return;
        setIsLoading(true);
        try {
            const [livroData, atosData] = await Promise.all([
                getLivroById(livroId),
                getAtosByLivroId(livroId)
            ]);

            if (!livroData) {
                router.push('/dashboard/livros');
                return;
            }
            
            setLivro(livroData);
            setAtos(atosData);
        } catch (error) {
            console.error("Falha ao buscar dados do livro:", error);
        } finally {
            setIsLoading(false);
        }
    }, [livroId, router]);


    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAtoSaved = () => {
        setIsAtoFormOpen(false);
        setAtoToEdit(null);
        toast({
            title: 'Sucesso!',
            description: `Nova averbação adicionada à folha.`,
        });
        loadData(); 
    }

    const handleEditClick = (ato: Ato) => {
        setAtoToEdit(ato);
        setIsAtoFormOpen(true);
    };
    
    const handlePdfDownload = () => {
        toast({
            title: "Função de Demonstração",
            description: `Em uma aplicação real, o download do arquivo "${livro?.urlPdfOriginal}" seria iniciado.`,
        })
    }

    const filteredAtos = useMemo(() => {
        if (!searchTerm) {
            return atos;
        }
        return atos.filter(ato => 
            ato.tipoAto.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ato.partes.some(parte => parte.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [atos, searchTerm]);


    if (isLoading) {
        return <Loading />;
    }

    if (!livro) {
        return <div className="text-center p-8">Livro não encontrado.</div>;
    }
    
    const canAverbate = livro.status === 'Concluído' || livro.status === 'Arquivado';

    return (
        <>
            <div className="space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()}>
                            <ArrowLeft className="h-4 w-4" />
                            <span className="sr-only">Voltar</span>
                        </Button>
                        <div>
                            <h1 className="font-headline text-3xl font-bold tracking-tight">
                                Livro {livro.numero.toString().padStart(3, '0')}/{livro.ano} - {livro.tipo}
                            </h1>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground mt-1">
                                <Badge variant={getStatusVariant(livro.status)} className="gap-1.5">
                                    <CheckCircle className="h-3 w-3"/>
                                    {livro.status}
                                </Badge>
                                {livro.dataAbertura && (
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        Abertura: {format(parseISO(livro.dataAbertura), "dd/MM/yyyy")}
                                    </div>
                                )}
                                {livro.dataFechamento && (
                                     <div className="flex items-center gap-1.5">
                                        <Calendar className="h-4 w-4" />
                                        Fechamento: {format(parseISO(livro.dataFechamento), "dd/MM/yyyy")}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                         {livro.conteudoMarkdown && (
                            <Button variant="outline" onClick={() => setIsMarkdownViewerOpen(true)}>
                                <FileCode className="mr-2 h-4 w-4" />
                                Ver Markdown
                            </Button>
                        )}
                         {livro.urlPdfOriginal && (
                            <Button variant="outline" onClick={handlePdfDownload}>
                                <FileDown className="mr-2 h-4 w-4" />
                                Ver PDF Original
                            </Button>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Folhas do Livro (Atos)</CardTitle>
                        <CardDescription>
                            Total de {filteredAtos.length} de {livro.totalAtos} folhas encontradas neste livro.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Buscar por tipo de ato ou partes..." 
                                    className="pl-8" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[100px]">Folha Nº</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead>Partes Envolvidas</TableHead>
                                        <TableHead className="w-[120px]">Averbações</TableHead>
                                        <TableHead className="w-[80px] text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAtos.length > 0 ? (
                                        filteredAtos.map((ato) => (
                                            <TableRow key={ato.id}>
                                                <TableCell className="font-medium">{ato.numeroAto.toString().padStart(3, '0')}</TableCell>
                                                <TableCell>{ato.tipoAto}</TableCell>
                                                <TableCell>{new Date(ato.dataAto).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        {ato.partes.map(parte => <span key={parte}>{parte}</span>)}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Badge variant={ato.averbacoes?.length > 0 ? "default" : "secondary"}>
                                                        {ato.averbacoes?.length || 0}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {user?.role === 'admin' && canAverbate && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(ato)}>
                                                            <MessageSquareQuote className="h-4 w-4" />
                                                            <span className="sr-only">Averbar Folha</span>
                                                        </Button>
                                                    )}
                                                     {user?.role !== 'admin' && (
                                                         <Button variant="ghost" size="icon" disabled>
                                                            <MessageSquareQuote className="h-4 w-4" />
                                                            <span className="sr-only">Averbar Folha</span>
                                                        </Button>
                                                     )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Nenhuma folha encontrada com os critérios de busca.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {livro && (
                <AtoFormDialog 
                    isOpen={isAtoFormOpen}
                    setIsOpen={setIsAtoFormOpen}
                    onAtoSaved={handleAtoSaved}
                    atoToEdit={atoToEdit}
                />
            )}
             {livro && (
                <MarkdownViewerDialog
                    isOpen={isMarkdownViewerOpen}
                    setIsOpen={setIsMarkdownViewerOpen}
                    markdownContent={livro.conteudoMarkdown || ''}
                    livro={livro}
                />
            )}
        </>
    );
}
