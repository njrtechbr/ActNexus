
"use client";

import { useState, useEffect } from 'react';
import { getClienteById, getAtosByClienteId, type Cliente, type Ato } from '@/services/apiClientLocal';
import { summarizeClientHistory } from '@/lib/actions';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, Sparkles, Loader2, Database } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

export default function DetalhesClientePage() {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const clienteId = params.id as string;

    useEffect(() => {
        if (!clienteId) return;

        async function loadData() {
            try {
                const [clienteData, atosData] = await Promise.all([
                    getClienteById(clienteId),
                    getAtosByClienteId(clienteId)
                ]);

                if (!clienteData) {
                    router.push('/dashboard/clientes');
                    return;
                }
                
                setCliente(clienteData);
                setAtos(atosData);
            } catch (error) {
                console.error("Falha ao buscar dados do cliente:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, [clienteId, router]);

    const handleSummarize = async () => {
        if (!cliente || !atos) return;
        setIsSummarizing(true);
        setSummary(null);
        try {
            const result = await summarizeClientHistory({
                clientName: cliente.nome,
                acts: atos.map(a => ({ type: a.tipoAto, date: a.dataAto })),
            });
            setSummary(result.summary);
        } catch (error) {
            console.error("Falha ao gerar resumo:", error);
            toast({
                variant: 'destructive',
                title: 'Erro de IA',
                description: 'Não foi possível gerar o resumo do cliente.',
            });
        } finally {
            setIsSummarizing(false);
        }
    };

    if (isLoading) {
        return <Loading />;
    }

    if (!cliente) {
        return <div className="text-center p-8">Cliente não encontrado.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                 <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            {cliente.tipo === 'PF' ? <User className="h-6 w-6 text-muted-foreground" /> : <Building className="h-6 w-6 text-muted-foreground" />}
                        </div>
                        <div>
                            <h1 className="font-headline text-3xl font-bold tracking-tight">
                                {cliente.nome}
                            </h1>
                            <p className="text-muted-foreground">
                            {cliente.cpfCnpj}
                            </p>
                        </div>
                    </div>
                 </div>
                 <Button onClick={handleSummarize} disabled={isSummarizing}>
                    {isSummarizing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Resumir com IA
                </Button>
            </div>

            {summary && (
                 <Alert>
                    <Sparkles className="h-4 w-4" />
                    <AlertTitle>Resumo do Cliente</AlertTitle>
                    <AlertDescription>
                       {summary}
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                
                <div className="space-y-6 lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle>Documentos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {cliente.documentos.length > 0 ? (
                                <ul className="space-y-2 text-sm">
                                    {cliente.documentos.map(doc => (
                                        <li key={doc.nome} className="flex items-center gap-2">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            <span>{doc.nome}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
                            )}
                        </CardContent>
                    </Card>

                    {cliente.dadosAdicionais && cliente.dadosAdicionais.length > 0 && (
                        <Card>
                             <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Database className="h-5 w-5"/>
                                    Dados Adicionais
                                </CardTitle>
                                <CardDescription>Campos salvos a partir de atos.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                {cliente.dadosAdicionais.map(item => (
                                    <div key={item.label} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                                        <span className="font-medium text-muted-foreground">{item.label}</span>
                                        <span className="font-semibold text-right text-foreground max-w-[70%] truncate" title={item.value}>{item.value}</span>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Folhas Vinculadas (Atos)</CardTitle>
                        <CardDescription>
                            Total de {atos.length} atos encontrados para este cliente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Livro</TableHead>
                                        <TableHead>Folha Nº</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Data</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {atos.length > 0 ? (
                                        atos.map((ato) => (
                                            <TableRow key={ato.id} onClick={() => router.push(`/dashboard/livros/${ato.livroId}`)} className="cursor-pointer">
                                                <TableCell className="font-medium">{ato.livroId.replace('livro-', '')}</TableCell>
                                                <TableCell>{ato.numeroAto.toString().padStart(3, '0')}</TableCell>
                                                <TableCell>{ato.tipoAto}</TableCell>
                                                <TableCell>{new Date(ato.dataAto).toLocaleDateString()}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Nenhum ato vinculado a este cliente.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
