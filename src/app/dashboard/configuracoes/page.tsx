
"use client";

import { useState, useEffect, useCallback, FC } from 'react';
import { useForm, useFormContext, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    getTiposDeLivro, addTipoDeLivro, removeTipoDeLivro,
    getTiposDeAto, addTipoDeAto, removeTipoDeAto,
    getNomesDeDocumento, addNomeDeDocumento, removeNomeDeDocumento,
    getTiposDeContato, addTipoDeContato, removeTipoDeContato,
    getPrompts, updatePrompt,
    type SystemPrompts,
} from '@/services/apiClientLocal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { X, PlusCircle, Loader2, BookType, FileSignature, FileText, Contact, PencilRuler, Building, BrainCircuit, Save, DatabaseZap, UploadCloud, File as FileIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Loading from './loading';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useConfig } from '@/hooks/use-config';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


// Section for Notary Data
const notaryFormSchema = z.object({
    nome: z.string().min(3, "O nome do cartório é obrigatório."),
    endereco: z.string().min(5, "O endereço é obrigatório."),
    cidade: z.string().min(2, "A cidade é obrigatória."),
    estado: z.string().min(2, "O estado é obrigatório."),
    cep: z.string().min(8, "O CEP é obrigatório."),
    telefone: z.string().min(10, "O telefone é obrigatório."),
    email: z.string().email("Email inválido."),
    tabeliao: z.string().min(3, "O nome do tabelião é obrigatório."),
});
type NotaryFormData = z.infer<typeof notaryFormSchema>;

function NotaryDataForm() {
    const { config, setConfig, isConfigLoading } = useConfig();
    const { toast } = useToast();
    const form = useForm<NotaryFormData>({
        resolver: zodResolver(notaryFormSchema),
        defaultValues: config?.notaryData || {},
    });

    useEffect(() => {
        if (config?.notaryData) {
            form.reset(config.notaryData);
        }
    }, [config, form]);

    const onSubmit = (data: NotaryFormData) => {
        setConfig({ ...config, notaryData: data });
        toast({ title: "Sucesso!", description: "Dados do cartório atualizados." });
    };

    if (isConfigLoading) return <p>Carregando dados do cartório...</p>;

    return (
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" />Dados do Cartório</CardTitle></CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="nome" render={({ field }) => (<FormItem><FormLabel>Nome do Cartório</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="tabeliao" render={({ field }) => (<FormItem><FormLabel>Tabelião Titular</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="endereco" render={({ field }) => (<FormItem><FormLabel>Endereço</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField control={form.control} name="cidade" render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="estado" render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="cep" render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="telefone" render={({ field }) => (<FormItem><FormLabel>Telefone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>E-mail</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit"><Save className="mr-2 h-4 w-4" />Salvar Dados do Cartório</Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}

// Section for Knowledge Base
function KnowledgeBaseManager() {
    const [files, setFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const { toast } = useToast();

    const handleFilesChange = (selectedFiles: FileList | null) => {
        if (selectedFiles) {
            setFiles(prev => [...prev, ...Array.from(selectedFiles)]);
        }
    };
    
    const handleDragEvent = (e: React.DragEvent<HTMLDivElement>, entering: boolean) => {
        e.preventDefault();
        setIsDragging(entering);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);
        handleFilesChange(e.dataTransfer.files);
    };

    const removeFile = (fileName: string) => {
        setFiles(prev => prev.filter(f => f.name !== fileName));
    };
    
    const handleTrain = () => {
        toast({
            title: "Simulação de Treinamento",
            description: `Em uma aplicação real, ${files.length} arquivos seriam enviados para indexação e treinamento do agente.`,
        });
        setFiles([]);
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><DatabaseZap className="h-5 w-5" />Base de Conhecimento do Agente</CardTitle>
                <CardDescription>Envie arquivos (PDF, TXT) para que o agente de IA possa usá-los como fonte de conhecimento para responder perguntas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div
                    onDragEnter={(e) => handleDragEvent(e, true)}
                    onDragOver={(e) => handleDragEvent(e, true)}
                    onDragLeave={(e) => handleDragEvent(e, false)}
                    onDrop={handleDrop}
                    className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/10" : "border-border"
                    }`}
                >
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm font-semibold">Arraste ou clique para anexar arquivos</p>
                    <input type="file" className="absolute inset-0 h-full w-full cursor-pointer opacity-0" multiple onChange={(e) => handleFilesChange(e.target.files)} />
                </div>
                
                {files.length > 0 && (
                    <div className="space-y-4">
                        <div className="space-y-2">
                             <h4 className="text-sm font-medium text-muted-foreground">Arquivos para Treinamento</h4>
                             <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                                {files.map((file, i) => (
                                     <div key={`${file.name}-${i}`} className="flex items-center justify-between gap-3 rounded-md border p-2">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <FileIcon className="h-4 w-4 flex-shrink-0" />
                                            <span className="truncate text-sm font-medium">{file.name}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(file.name)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                             </div>
                        </div>
                        <Button className="w-full" onClick={handleTrain}>
                            <DatabaseZap className="mr-2 h-4 w-4" />
                            Treinar Agente com {files.length} arquivo(s)
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}


// Section for AI & Prompts
const promptFormSchema = z.object({
  promptText: z.string().min(50, "O prompt parece muito curto."),
});
type PromptFormData = z.infer<typeof promptFormSchema>;

interface PromptEditorProps {
    promptKey: keyof SystemPrompts;
    title: string;
    description: string;
    onSave: (key: keyof SystemPrompts, text: string) => Promise<void>;
}

function PromptEditor({ promptKey, title, description, onSave }: PromptEditorProps) {
    const { config, isConfigLoading } = useConfig();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();
    
    const form = useForm<PromptFormData>({
        resolver: zodResolver(promptFormSchema),
        defaultValues: { promptText: config?.prompts?.[promptKey] || '' },
    });

     useEffect(() => {
        if (config?.prompts?.[promptKey]) {
            form.reset({ promptText: config.prompts[promptKey] });
        }
    }, [config, promptKey, form]);

    const onSubmit = async (data: PromptFormData) => {
        setIsSubmitting(true);
        try {
            await onSave(promptKey, data.promptText);
            toast({ title: "Sucesso!", description: `Prompt "${title}" atualizado.` });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar o prompt." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (isConfigLoading) return <p>Carregando prompt...</p>;

    return (
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <div className="space-y-1">
                    <h4 className="font-medium">{title}</h4>
                    <p className="text-sm text-muted-foreground">{description}</p>
                 </div>
                <FormField
                    control={form.control}
                    name="promptText"
                    render={({ field }) => (
                        <FormItem>
                            <FormControl>
                                <Textarea {...field} className="min-h-[200px] font-mono text-xs" />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                 <div className="flex justify-end">
                    <Button type="submit" size="sm" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
                        Salvar Prompt
                    </Button>
                </div>
            </form>
         </Form>
    );
}

function AiSettingsSection() {
    const { setConfig, isConfigLoading } = useConfig();
    const { toast } = useToast();

    const handleSavePrompt = async (key: keyof SystemPrompts, text: string) => {
        const currentPrompts = await getPrompts();
        const updatedPrompts = { ...currentPrompts, [key]: text };
        await updatePrompt(key, text);
        // We must update the central config state as well
        setConfig(prev => ({...prev!, prompts: updatedPrompts}));
    };
    
    const promptDefinitions: Omit<PromptEditorProps, 'onSave'>[] = [
        { promptKey: 'processLivroPdfPrompt', title: 'Processar Livro PDF', description: 'Usado para analisar o texto de um PDF de livro e extrair seus metadados e atos em formato Markdown.' },
        { promptKey: 'extractActDetailsPrompt', title: 'Extrair Detalhes do Ato', description: 'Analisa o conteúdo de um único ato para extrair a qualificação completa das partes e detalhes gerais.' },
        { promptKey: 'checkMinuteDataPrompt', title: 'Conferir Minuta', description: 'Compara o texto de uma minuta com os dados cadastrais dos clientes, apontando divergências e novos dados.' },
        { promptKey: 'generateQualificationPrompt', title: 'Gerar Qualificação', description: 'Cria um parágrafo de qualificação formatado a partir dos dados de um cliente.' },
        { promptKey: 'summarizeClientHistoryPrompt', title: 'Resumir Histórico do Cliente', description: 'Gera um resumo em linguagem natural sobre o perfil completo de um cliente.' },
    ];

    if (isConfigLoading) return <Loading />;
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" />Inteligência Artificial</CardTitle>
                <CardDescription>Ajuste os modelos e os prompts que a IA utiliza para executar as tarefas do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Accordion type="multiple" className="w-full space-y-4">
                    {promptDefinitions.map(prompt => (
                         <AccordionItem key={prompt.promptKey} value={prompt.promptKey} className="border-b-0 rounded-lg border bg-muted/30">
                            <AccordionTrigger className="px-4 py-3 text-base font-semibold hover:no-underline">
                                {prompt.title}
                            </AccordionTrigger>
                            <AccordionContent className="px-4 pb-4">
                                <PromptEditor {...prompt} onSave={handleSavePrompt} />
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            </CardContent>
        </Card>
    );
}

// Section for Parametrization Lists
const listFormSchema = z.object({
  novoItem: z.string().min(3, { message: 'O item deve ter pelo menos 3 caracteres.' }),
});
type ListFormData = z.infer<typeof listFormSchema>;

interface ConfigListManagerProps {
    title: string;
    description: string;
    icon: React.ElementType;
    fetcher: () => Promise<string[]>;
    adder: (item: string) => Promise<void>;
    remover: (item: string) => Promise<void>;
}

const ConfigListManager: FC<ConfigListManagerProps> = ({ title, description, icon: Icon, fetcher, adder, remover }) => {
    const [items, setItems] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { toast } = useToast();

    const form = useForm<ListFormData>({
        resolver: zodResolver(listFormSchema),
        defaultValues: { novoItem: '' },
    });

    const loadItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetcher();
            setItems(data);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro ao Carregar', description: `Não foi possível buscar os dados para "${title}".` });
        } finally {
            setIsLoading(false);
        }
    }, [fetcher, toast, title]);

    useEffect(() => {
        loadItems();
    }, [loadItems]);

    const onSubmit = async (data: ListFormData) => {
        try {
            await adder(data.novoItem);
            toast({ title: 'Sucesso!', description: `"${data.novoItem}" adicionado a ${title}.` });
            form.reset();
            loadItems();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: (error as Error).message });
        }
    };

    const handleRemove = async (item: string) => {
        try {
            await remover(item);
            toast({ title: 'Sucesso!', description: `"${item}" removido de ${title}.` });
            loadItems();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Erro', description: `Não foi possível remover o item.` });
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Icon className="h-5 w-5" />{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div>
                    <h3 className="mb-4 text-sm font-medium text-muted-foreground">Itens Atuais</h3>
                    {isLoading ? <p className="text-sm text-muted-foreground">Carregando...</p> : 
                    items.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {items.map(item => (
                                <Badge key={item} variant="secondary" className="gap-2 text-base py-1 pl-3 pr-2">
                                    {item}
                                    <button onClick={() => handleRemove(item)} className="rounded-full p-0.5 hover:bg-muted-foreground/20" aria-label={`Remover ${item}`}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">Nenhum item cadastrado.</p>
                    )}
                </div>
                <Separator />
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
                         <h3 className="text-sm font-medium text-muted-foreground">Adicionar Novo Item</h3>
                        <FormField
                            control={form.control}
                            name="novoItem"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex gap-2">
                                        <FormControl>
                                            <Input placeholder="Digite o novo nome..." {...field} />
                                        </FormControl>
                                        <Button type="submit" disabled={form.formState.isSubmitting} size="sm">
                                            {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                            Adicionar
                                        </Button>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
};

// Main Page
export default function ConfiguracoesPage() {
    const { isConfigLoading } = useConfig();

    if (isConfigLoading) return <Loading />;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="font-headline text-3xl font-bold tracking-tight">Configurações do Sistema</h1>
                <p className="text-muted-foreground">
                    Gerencie os parâmetros e as opções disponíveis no ActNexus.
                </p>
            </div>
            
            <Tabs defaultValue="parametros" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="parametros">Parâmetros Gerais</TabsTrigger>
                    <TabsTrigger value="cartorio">Dados do Cartório</TabsTrigger>
                    <TabsTrigger value="ia">Prompts de IA</TabsTrigger>
                    <TabsTrigger value="conhecimento">Base de Conhecimento</TabsTrigger>
                </TabsList>
                
                <TabsContent value="parametros" className="mt-6">
                     <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><PencilRuler className="h-5 w-5" />Listas de Parametrização</CardTitle>
                                <CardDescription>Adicione ou remova as opções que aparecem em campos de seleção por todo o sistema.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                 <ConfigListManager title="Tipos de Livro" description="Tipos de livro que podem ser cadastrados." icon={BookType} fetcher={getTiposDeLivro} adder={addTipoDeLivro} remover={removeTipoDeLivro} />
                                 <ConfigListManager title="Tipos de Ato" description="Tipos de atos notariais que podem ser registrados." icon={FileSignature} fetcher={getTiposDeAto} adder={addTipoDeAto} remover={removeTipoDeAto} />
                                 <ConfigListManager title="Nomes de Documento" description="Nomes padrão para documentos de clientes." icon={FileText} fetcher={getNomesDeDocumento} adder={addNomeDeDocumento} remover={removeNomeDeDocumento} />
                                 <ConfigListManager title="Tipos de Contato" description="Tipos de contato disponíveis para clientes." icon={Contact} fetcher={getTiposDeContato} adder={addTipoDeContato} remover={removeTipoDeContato} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="cartorio" className="mt-6">
                    <NotaryDataForm />
                </TabsContent>
                
                <TabsContent value="ia" className="mt-6">
                    <AiSettingsSection />
                </TabsContent>

                <TabsContent value="conhecimento" className="mt-6">
                    <KnowledgeBaseManager />
                </TabsContent>
            </Tabs>
        </div>
    );
}
