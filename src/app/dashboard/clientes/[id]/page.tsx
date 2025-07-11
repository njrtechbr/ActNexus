

"use client";

import { useState, useEffect, useCallback } from 'react';
import { getClienteById, getAtosByClienteId, type Cliente, type Ato, type DocumentoCliente } from '@/services/apiClientLocal';
import { summarizeClientHistory } from '@/lib/actions';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, Sparkles, Loader2, Database, ClipboardCopy, FileSignature, CalendarClock, CheckCircle, XCircle, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { QualificationGeneratorDialog } from '@/components/dashboard/qualification-generator-dialog';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { format, isBefore, isWithinInterval, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { ClientEditDialog } from '@/components/dashboard/client-edit-dialog';

interface UserProfile {
    role: string;
}

const getDocumentStatus = (doc: DocumentoCliente): {text: string; variant: "default" | "secondary" | "destructive", icon: React.ElementType} => {
    if (!doc.dataValidade) {
        return { text: "Válido", variant: "secondary", icon: CheckCircle };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const validityDate = parseISO(doc.dataValidade);

    if (isBefore(validityDate, today)) {
        return { text: "Expirado", variant: "destructive", icon: XCircle };
    }
    
    if (isWithinInterval(validityDate, { start: today, end: addDays(today, 30) })) {
        return { text: "Vence em breve", variant: "default", icon: CalendarClock };
    }

    return { text: "Válido", variant: "secondary", icon: CheckCircle };
};

export default function DetalhesClientePage() {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [isQualificationDialogOpen, setIsQualificationDialogOpen] = useState(false);
    const [isClientEditDialogOpen, setIsClientEditDialogOpen] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { copy } = useCopyToClipboard();
    const clienteId = params.id as string;

    useEffect(() => {
        const userData = localStorage.getItem("actnexus_user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const loadData = useCallback(async () => {
        if (!clienteId) return;
        setIsLoading(true);
        try {
            const [clienteData, atosData] = await Promise.all([
                getClienteById(clienteId),
                getAtosByClienteId(clienteId)
            ]);

            if (!clienteData) {
                toast({
                    variant: 'destructive',
                    title: 'Cliente não encontrado',
                    description: 'O cliente que você está tentando acessar não existe.',
                });
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
    }, [clienteId, router, toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

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
    
    const handleCopy = (value: string, label: string) => {
        copy(value);
        toast({
            title: 'Copiado!',
            description: `O campo "${label}" foi copiado para a área de transferência.`,
        });
    };

    const handleClientUpdated = () => {
        setIsClientEditDialogOpen(false);
        toast({
            title: 'Sucesso!',
            description: 'Dados do cliente atualizados.',
        });
        loadData();
    };

    if (isLoading) {
        return <Loading />;
    }

    if (!cliente) {
        return <div className="text-center p-8">Cliente não encontrado.</div>;
    }

    return (
        <>
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
                    <div className='flex items-center gap-2'>
                        {user?.role === 'admin' && (
                            <Button variant="secondary" onClick={() => setIsClientEditDialogOpen(true)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar Cliente
                            </Button>
                        )}
                        <Button onClick={handleSummarize} disabled={isSummarizing}>
                            {isSummarizing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Resumir com IA
                        </Button>
                    </div>
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
                                <CardDescription>Documentos anexados e suas validades.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {cliente.documentos && cliente.documentos.length > 0 ? (
                                    <ul className="space-y-3">
                                        {cliente.documentos.map(doc => {
                                            const status = getDocumentStatus(doc);
                                            return (
                                                <li key={doc.nome} className="flex items-center justify-between gap-2 text-sm border-b pb-3 last:border-b-0 last:pb-0">
                                                    <div className="flex items-start gap-3">
                                                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                                                        <div className="flex flex-col">
                                                          <span className="font-medium">{doc.nome}</span>
                                                            {doc.dataValidade ? (
                                                                <span className="text-xs text-muted-foreground">
                                                                    Validade: {format(parseISO(doc.dataValidade), 'dd/MM/yyyy')}
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Sem data de validade</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Badge variant={status.variant} className="gap-1.5 whitespace-nowrap">
                                                        <status.icon className="h-3 w-3"/>
                                                        {status.text}
                                                    </Badge>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">Nenhum documento cadastrado.</p>
                                )}
                            </CardContent>
                        </Card>

                        {cliente.dadosAdicionais && cliente.dadosAdicionais.length > 0 && (
                             <Card>
                                <CardHeader>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="flex items-center gap-2">
                                                <Database className="h-5 w-5"/>
                                                Dados Adicionais
                                            </CardTitle>
                                            <CardDescription>Campos salvos a partir de atos.</CardDescription>
                                        </div>
                                        <Button variant="secondary" onClick={() => setIsQualificationDialogOpen(true)}>
                                            <FileSignature className="mr-2 h-4 w-4"/>
                                            Gerar Qualificação
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    {cliente.dadosAdicionais.map(item => (
                                        <div key={item.label} className="group flex justify-between items-center rounded-md p-2 -mx-2 hover:bg-muted/50">
                                            <div>
                                                <span className="font-medium text-muted-foreground">{item.label}</span>
                                                <p className="font-semibold text-foreground max-w-[250px] truncate" title={item.value}>{item.value}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleCopy(item.value, item.label)}>
                                                <ClipboardCopy className="h-4 w-4"/>
                                            </Button>
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
            {cliente && (
                <QualificationGeneratorDialog
                    isOpen={isQualificationDialogOpen}
                    setIsOpen={setIsQualificationDialogOpen}
                    cliente={cliente}
                />
            )}
             {cliente && user?.role === 'admin' && (
                <ClientEditDialog
                    isOpen={isClientEditDialogOpen}
                    setIsOpen={setIsClientEditDialogOpen}
                    onClientUpdated={handleClientUpdated}
                    cliente={cliente}
                />
            )}
        </>
    );
}
