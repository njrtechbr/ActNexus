
"use client";

import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getClienteById, getAtosByClienteId, updateCliente, type Cliente, type Ato, type Evento } from '@/services/apiClientLocal';
import { summarizeClientHistory } from '@/lib/actions';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText, Sparkles, Loader2, Database, ClipboardCopy, FileSignature, CalendarClock, CheckCircle, XCircle, Pencil, Mail, Phone, MessageSquare, Notebook, MapPin, PlusCircle, Trash2, Save, UploadCloud, File as FileIcon, Eye, Download, Printer, History, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { QualificationGeneratorDialog } from '@/components/dashboard/qualification-generator-dialog';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { format, isBefore, isWithinInterval, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


interface UserProfile {
    role: string;
    name: string;
}

const getDocumentStatus = (doc: { dataValidade?: string | Date | null }): {text: string; variant: "default" | "secondary" | "destructive", icon: React.ElementType} => {
    if (!doc.dataValidade) {
        return { text: "Válido", variant: "secondary", icon: CheckCircle };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const validityDate = typeof doc.dataValidade === 'string' ? parseISO(doc.dataValidade) : doc.dataValidade;

    if (!validityDate || isNaN(validityDate.getTime())) {
         return { text: "Data inválida", variant: "destructive", icon: XCircle };
    }

    if (isBefore(validityDate, today)) {
        return { text: "Expirado", variant: "destructive", icon: XCircle };
    }
    
    const intervalEnd = addDays(today, 30);
    if (isWithinInterval(validityDate, { start: today, end: intervalEnd })) {
        return { text: "Vence em breve", variant: "default", icon: CalendarClock };
    }

    return { text: "Válido", variant: "secondary", icon: CheckCircle };
};

const contatoSchema = z.object({
    id: z.string(),
    tipo: z.enum(['email', 'telefone', 'whatsapp']),
    valor: z.string().min(1, { message: "O valor é obrigatório."}),
    label: z.string().optional(),
});

const enderecoSchema = z.object({
    id: z.string(),
    logradouro: z.string().min(1, "Obrigatório"),
    numero: z.string().min(1, "Obrigatório"),
    bairro: z.string().min(1, "Obrigatório"),
    cidade: z.string().min(1, "Obrigatório"),
    estado: z.string().min(1, "Obrigatório"),
    cep: z.string().min(1, "Obrigatório"),
    label: z.string().optional(),
});

const documentoSchema = z.object({
  nome: z.string(),
  url: z.string(),
  dataValidade: z.date().optional().nullable(),
});

const observacaoSchema = z.object({
    texto: z.string().min(1, "O texto não pode ser vazio"),
    autor: z.string(),
    data: z.string(),
    tipo: z.enum(['ia', 'manual'])
});

const formSchema = z.object({
  contatos: z.array(contatoSchema).optional(),
  enderecos: z.array(enderecoSchema).optional(),
  observacoes: z.array(observacaoSchema).optional(),
  documentos: z.array(documentoSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;


export default function DetalhesClientePage() {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSummarizing, setIsSummarizing] = useState(false);
    const [isQualificationDialogOpen, setIsQualificationDialogOpen] = useState(false);
    const [user, setUser] = useState<UserProfile | null>(null);
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const { copy } = useCopyToClipboard();
    const clienteId = params.id as string;

    const form = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {},
    });

    const { fields: contatoFields, append: appendContato, remove: removeContato } = useFieldArray({ control: form.control, name: "contatos" });
    const { fields: enderecoFields, append: appendEndereco, remove: removeEndereco } = useFieldArray({ control: form.control, name: "enderecos" });
    const { fields: obsFields, append: appendObs, remove: removeObs } = useFieldArray({ control: form.control, name: "observacoes" });
    const { fields: docFields, append: appendDoc, remove: removeDoc } = useFieldArray({ control: form.control, name: "documentos" });

    useEffect(() => {
        const userData = localStorage.getItem("actnexus_user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const resetFormValues = useCallback((clienteData: Cliente) => {
        form.reset({
            contatos: clienteData.contatos || [],
            enderecos: clienteData.enderecos || [],
            observacoes: clienteData.observacoes || [],
            documentos: clienteData.documentos?.map(doc => ({
                ...doc,
                dataValidade: doc.dataValidade ? parseISO(doc.dataValidade) : null,
            })) || [],
        });
    }, [form]);

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
            resetFormValues(clienteData);

        } catch (error) {
            console.error("Falha ao buscar dados do cliente:", error);
        } finally {
            setIsLoading(false);
        }
    }, [clienteId, router, toast, resetFormValues]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleSummarize = async () => {
        if (!cliente || !atos || !user) return;
        setIsSummarizing(true);
        try {
            const atoHistory = atos.map(a => ({ type: a.tipoAto, date: a.dataAto }));
            const result = await summarizeClientHistory({
                ...cliente,
                atos: atoHistory,
            });

            const newObservation = {
                texto: result.summary,
                autor: user.name,
                data: new Date().toISOString(),
                tipo: 'ia' as const
            };
            
            await updateCliente(cliente.id, { observacoes: [...(cliente.observacoes || []), newObservation] }, user.name);

            toast({
                title: 'Resumo Gerado e Salvo!',
                description: 'O resumo da IA foi adicionado como uma nova observação.',
            });
            
            await loadData();

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

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const newDocs = Array.from(files).map(file => ({
                nome: file.name,
                url: `/docs/simulado/${file.name}`,
                dataValidade: null
            }));
            appendDoc(newDocs as any);
        }
        event.target.value = '';
    };

    const handleDocumentAction = (doc: { nome: string }, action: 'view' | 'download' | 'print') => {
        const messages = {
            view: `Em uma aplicação real, o documento "${doc.nome}" seria aberto para visualização.`,
            download: `Em uma aplicação real, o download do documento "${doc.nome}" seria iniciado.`,
            print: `Em uma aplicação real, a janela de impressão para o documento "${doc.nome}" seria aberta.`
        };
        toast({
            title: "Função Simulada",
            description: messages[action],
        });
    };


    const onSubmit = async (data: FormData) => {
        if (!cliente || !user) return;
        setIsSubmitting(true);
        try {
            const clienteData = {
                ...data,
                observacoes: data.observacoes?.map(obs => {
                    // Garante que novas observações tenham autor e data
                    if (!obs.data) {
                        return {
                            ...obs,
                            autor: user.name,
                            data: new Date().toISOString(),
                            tipo: 'manual' as const,
                        };
                    }
                    return obs;
                }) || [],
                documentos: data.documentos?.map(doc => ({
                    ...doc,
                    dataValidade: doc.dataValidade ? format(doc.dataValidade, 'yyyy-MM-dd') : undefined,
                })) || [],
            };
            await updateCliente(cliente.id, clienteData, user.name);
            toast({ title: 'Sucesso!', description: 'Dados do cliente atualizados.' });
            setIsEditing(false);
            await loadData();
        } catch (error) {
            console.error("Falha ao atualizar cliente:", error);
            toast({ variant: "destructive", title: "Erro ao Salvar", description: "Não foi possível atualizar o cliente." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        if(cliente) {
            resetFormValues(cliente);
        }
    }

    const contactIcons = {
        email: Mail,
        telefone: Phone,
        whatsapp: MessageSquare,
    };

    if (isLoading) {
        return <Loading />;
    }

    if (!cliente) {
        return <div className="text-center p-8">Cliente não encontrado.</div>;
    }

    const docList = isEditing ? docFields : cliente.documentos || [];

    return (
        <>
            <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button variant="outline" size="icon" onClick={() => router.back()} type="button">
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
                        {user?.role === 'admin' && !isEditing && (
                            <Button variant="secondary" onClick={() => setIsEditing(true)} type="button">
                                <Pencil className="mr-2 h-4 w-4" />
                                Editar Cliente
                            </Button>
                        )}
                        {isEditing && (
                            <>
                                <Button variant="outline" onClick={handleCancelEdit} type="button">Cancelar</Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Salvar
                                </Button>
                            </>
                        )}
                        <Button onClick={handleSummarize} disabled={isSummarizing || isEditing} type="button">
                            {isSummarizing ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Resumir com IA
                        </Button>
                    </div>
                </div>

                <Tabs defaultValue="dados">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="dados">Dados Principais</TabsTrigger>
                        <TabsTrigger value="atos">Folhas Vinculadas ({atos.length})</TabsTrigger>
                        <TabsTrigger value="documentos">Documentos ({docList.length})</TabsTrigger>
                         <TabsTrigger value="eventos">Eventos ({cliente.eventos?.length || 0})</TabsTrigger>
                    </TabsList>
                    
                    {/* DADOS PRINCIPAIS */}
                    <TabsContent value="dados" className="mt-4">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {/* CONTATOS */}
                            <Card className="lg:col-span-1">
                                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5" />Contatos</CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {isEditing ? (
                                        <>
                                            {contatoFields.map((field, index) => (
                                                <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                                                     <FormField control={form.control} name={`contatos.${index}.tipo`} render={({ field }) => (
                                                        <FormItem className="w-28"><FormLabel>Tipo</FormLabel>
                                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                                <FormControl><SelectTrigger><SelectValue/></SelectTrigger></FormControl>
                                                                <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="telefone">Telefone</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )}/>
                                                    <FormField control={form.control} name={`contatos.${index}.valor`} render={({ field }) => (
                                                        <FormItem className="flex-1"><FormLabel>Valor</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>
                                                    )}/>
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeContato(index)}><Trash2 className="h-4 w-4" /></Button>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendContato({ id: `contato-${Date.now()}`, tipo: 'email', valor: '', label: '' })}><PlusCircle className="mr-2 h-4 w-4" />Contato</Button>
                                        </>
                                    ) : (
                                        cliente.contatos && cliente.contatos.length > 0 ? (
                                            cliente.contatos.map(contato => {
                                                const Icon = contactIcons[contato.tipo];
                                                return (
                                                    <div key={contato.id} className="border-l-2 border-primary pl-3">
                                                        <div className='flex items-center gap-2'><Icon className="h-4 w-4 text-muted-foreground"/><p className="font-semibold">{contato.valor}</p></div>
                                                        <p className="text-xs text-muted-foreground capitalize ml-6">{contato.label || contato.tipo}</p>
                                                    </div>
                                                )
                                            })
                                        ) : <p className="text-muted-foreground">Nenhum contato cadastrado.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* ENDEREÇOS */}
                             <Card className="lg:col-span-1">
                                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" />Endereços</CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                     {isEditing ? (
                                         <>
                                            {enderecoFields.map((field, index) => (
                                                 <div key={field.id} className="space-y-2 p-2 border rounded-md relative">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => removeEndereco(index)} className="absolute top-0 right-0 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                       <FormField control={form.control} name={`enderecos.${index}.logradouro`} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                                       <FormField control={form.control} name={`enderecos.${index}.numero`} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                                    </div>
                                                     <FormField control={form.control} name={`enderecos.${index}.bairro`} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field}/></FormControl><FormMessage/></FormItem>)}/>
                                                </div>
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendEndereco({ id: `end-${Date.now()}`, logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' })}><PlusCircle className="mr-2 h-4 w-4" />Endereço</Button>
                                         </>
                                     ) : (
                                        cliente.enderecos && cliente.enderecos.length > 0 ? (
                                            cliente.enderecos.map(end => (
                                                <div key={end.id} className="border-l-2 border-primary pl-3">
                                                    <p className="font-semibold">{end.logradouro}, {end.numero}</p>
                                                    <p className="text-xs text-muted-foreground">{end.bairro}, {end.cidade} - {end.estado}</p>
                                                    <p className="text-xs text-muted-foreground">CEP: {end.cep}</p>
                                                </div>
                                            ))
                                        ) : <p className="text-muted-foreground">Nenhum endereço cadastrado.</p>
                                     )}
                                </CardContent>
                            </Card>
                            
                            {/* OBSERVAÇÕES */}
                            <Card className="lg:col-span-1">
                                <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><Notebook className="h-5 w-5" />Observações</CardTitle></CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {isEditing ? (
                                        <>
                                            {obsFields.map((field, index) => (
                                                <FormField key={field.id} control={form.control} name={`observacoes.${index}.texto`} render={({ field }) => (
                                                    <FormItem>
                                                    <div className="flex items-center gap-2">
                                                        <Textarea {...field} placeholder={`Observação #${index + 1}`} />
                                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeObs(index)}><Trash2 className="h-4 w-4" /></Button>
                                                    </div>
                                                    </FormItem>
                                                )} />
                                            ))}
                                            <Button type="button" variant="outline" size="sm" onClick={() => appendObs({ texto: "", autor: "", data: "", tipo: 'manual' })}><PlusCircle className="mr-2 h-4 w-4" />Observação</Button>
                                        </>
                                    ) : (
                                         cliente.observacoes && cliente.observacoes.length > 0 ? (
                                            [...cliente.observacoes].reverse().map((obs, index) => (
                                                <div key={index} className="border-l-2 pl-3 group relative">
                                                    {obs.tipo === 'ia' && <Sparkles className="h-3.5 w-3.5 absolute -left-2 top-0 text-primary" title="Gerado por IA"/>}
                                                    <p className="text-foreground whitespace-pre-wrap">{obs.texto}</p>
                                                    <p className='text-xs text-muted-foreground mt-1'>
                                                        - {obs.autor}, {format(parseISO(obs.data), "'em' dd/MM/yy 'às' HH:mm")}
                                                    </p>
                                                </div>
                                            ))
                                        ) : <p className="text-muted-foreground">Nenhuma observação.</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* DADOS ADICIONAIS */}
                            <div className="lg:col-span-3">
                                <Card>
                                    <CardHeader>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <Database className="h-5 w-5"/>
                                                    Dados Adicionais (Qualificação)
                                                </CardTitle>
                                                <CardDescription>Campos salvos a partir de atos, usados para gerar a qualificação.</CardDescription>
                                            </div>
                                            <Button variant="secondary" size="sm" onClick={() => setIsQualificationDialogOpen(true)} type="button">
                                                <FileSignature className="mr-2 h-4 w-4"/>
                                                Gerar Qualificação com IA
                                            </Button>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="max-h-60 overflow-y-auto">
                                        {cliente.dadosAdicionais && cliente.dadosAdicionais.length > 0 ? (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-sm">
                                            {cliente.dadosAdicionais.map(item => (
                                                <div key={item.label} className="group flex justify-between items-center rounded-md p-2 -mx-2 hover:bg-muted/50">
                                                    <div>
                                                        <span className="font-medium text-muted-foreground">{item.label}</span>
                                                        <p className="font-semibold text-foreground max-w-[250px] truncate" title={item.value}>{item.value}</p>
                                                    </div>
                                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleCopy(item.value, item.label)} type="button">
                                                        <ClipboardCopy className="h-4 w-4"/>
                                                    </Button>
                                                </div>
                                            ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-center text-muted-foreground py-4">Nenhum dado adicional salvo.</p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>
                    
                    {/* FOLHAS VINCULADAS */}
                    <TabsContent value="atos">
                        <Card>
                            <CardHeader>
                                <CardTitle>Histórico de Atos</CardTitle>
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
                    </TabsContent>

                    {/* DOCUMENTOS */}
                    <TabsContent value="documentos">
                        <Card>
                             <CardHeader>
                                <CardTitle>Documentos Anexados</CardTitle>
                                <CardDescription>Gerencie os documentos do cliente e suas validades.</CardDescription>
                            </CardHeader>
                             <CardContent className="space-y-4">
                                {isEditing && (
                                     <FormItem>
                                        <FormLabel>Anexar Novos Documentos</FormLabel>
                                        <FormControl>
                                            <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
                                                <UploadCloud className="h-10 w-10 text-muted-foreground" />
                                                <p className="mt-2 text-sm text-muted-foreground">Arraste ou clique para anexar</p>
                                                <Input 
                                                    type="file" 
                                                    multiple 
                                                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                                    onChange={handleFileChange}
                                                />
                                            </div>
                                        </FormControl>
                                    </FormItem>
                                )}

                                {docList.length > 0 ? (
                                    <ul className="space-y-3">
                                        {docList.map((doc, index) => {
                                            const status = getDocumentStatus(doc as {dataValidade?: string | Date | null});
                                            const dateToFormat = (doc as any).dataValidade;
                                            return (
                                            <li key={(doc as any).id || index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-sm border-b pb-3 last:border-b-0 last:pb-0">
                                                 <div className="flex items-start gap-3 w-full sm:w-auto overflow-hidden">
                                                    <FileIcon className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="font-medium truncate cursor-pointer hover:underline" onClick={() => !isEditing && handleDocumentAction(doc, 'view')}>{doc.nome}</span>
                                                        {!isEditing && dateToFormat && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Validade: {format(dateToFormat, 'dd/MM/yyyy')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {isEditing ? (
                                                    <div className="flex items-center gap-2 w-full sm:w-auto ml-7 sm:ml-0">
                                                        <FormField
                                                            control={form.control}
                                                            name={`documentos.${index}.dataValidade`}
                                                            render={({ field }) => (
                                                            <FormItem className="flex-1">
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                    <FormControl>
                                                                        <Button
                                                                        variant={"outline"}
                                                                        className={cn(
                                                                            "w-full justify-start text-left font-normal",
                                                                            !field.value && "text-muted-foreground"
                                                                        )}
                                                                        >
                                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                                        {field.value ? (
                                                                            format(field.value, "dd/MM/yyyy")
                                                                        ) : (
                                                                            <span>Validade</span>
                                                                        )}
                                                                        </Button>
                                                                    </FormControl>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent className="w-auto p-0">
                                                                    <Calendar
                                                                        mode="single"
                                                                        selected={field.value ?? undefined}
                                                                        onSelect={field.onChange}
                                                                        initialFocus
                                                                    />
                                                                    </PopoverContent>
                                                                </Popover>
                                                            </FormItem>
                                                            )}
                                                        />
                                                        <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => removeDoc(index)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1">
                                                        <Badge variant={status.variant} className="gap-1.5 whitespace-nowrap">
                                                            <status.icon className="h-3 w-3"/>
                                                            {status.text}
                                                        </Badge>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDocumentAction(doc, 'download')}><Download className="h-4 w-4" /></Button>
                                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDocumentAction(doc, 'print')}><Printer className="h-4 w-4" /></Button>
                                                    </div>
                                                )}
                                            </li>
                                        )})}
                                    </ul>
                                ) : (
                                    !isEditing && <p className="text-sm text-muted-foreground p-10 text-center">Nenhum documento cadastrado.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* EVENTOS */}
                    <TabsContent value="eventos">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> Histórico de Eventos</CardTitle>
                                <CardDescription>Registro de todas as alterações e atividades do cliente.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                {(cliente.eventos && cliente.eventos.length > 0) ? (
                                    [...cliente.eventos].reverse().map(evento => (
                                        <div key={evento.data} className="flex items-start gap-4">
                                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-sm font-medium">{evento.descricao}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    por {evento.autor} em {format(parseISO(evento.data), 'dd/MM/yyyy HH:mm:ss')}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-center text-muted-foreground p-8">Nenhum evento registrado.</p>
                                )}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
            </form>
            </Form>
            {cliente && (
                <QualificationGeneratorDialog
                    isOpen={isQualificationDialogOpen}
                    setIsOpen={setIsQualificationDialogOpen}
                    cliente={cliente}
                />
            )}
        </>
    );
}

