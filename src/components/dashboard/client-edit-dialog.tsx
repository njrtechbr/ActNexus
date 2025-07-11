
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { Loader2, UploadCloud, File as FileIcon, X, CalendarIcon, PlusCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { updateCliente, type Cliente } from '@/services/apiClientLocal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const documentoSchema = z.object({
  nome: z.string(),
  url: z.string(),
  dataValidade: z.date().optional(),
});

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
})

const formSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  cpfCnpj: z.string().min(11, { message: 'CPF/CNPJ inválido.' }),
  tipo: z.enum(['PF', 'PJ'], { required_error: 'Selecione o tipo de cliente.' }),
  contatos: z.array(contatoSchema).optional(),
  enderecos: z.array(enderecoSchema).optional(),
  observacoes: z.array(z.object({ value: z.string() })).optional(),
  documentos: z.array(documentoSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ClientEditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClientUpdated: () => void;
  cliente: Cliente;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="mb-2 text-lg font-medium border-b pb-1">{children}</h3>
);

export function ClientEditDialog({
  isOpen,
  setIsOpen,
  onClientUpdated,
  cliente
}: ClientEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {},
  });

  const { fields: docFields, append: appendDoc, remove: removeDoc, replace: replaceDocs } = useFieldArray({ control: form.control, name: "documentos" });
  const { fields: obsFields, append: appendObs, remove: removeObs, replace: replaceObs } = useFieldArray({ control: form.control, name: "observacoes" });
  const { fields: contatoFields, append: appendContato, remove: removeContato, replace: replaceContatos } = useFieldArray({ control: form.control, name: "contatos" });
  const { fields: enderecoFields, append: appendEndereco, remove: removeEndereco, replace: replaceEnderecos } = useFieldArray({ control: form.control, name: "enderecos" });

  useEffect(() => {
    if (cliente && isOpen) {
      form.reset({
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj,
        tipo: cliente.tipo,
      });
      
      replaceContatos(cliente.contatos || []);
      replaceEnderecos(cliente.enderecos || []);
      replaceObs(cliente.observacoes?.map(obs => ({ value: obs })) || []);

      const formDocs = cliente.documentos?.map(doc => ({
          ...doc,
          dataValidade: doc.dataValidade ? parseISO(doc.dataValidade) : undefined,
      })) || [];
      replaceDocs(formDocs);
    }
  }, [cliente, isOpen, form, replaceContatos, replaceEnderecos, replaceObs, replaceDocs]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocs = Array.from(files).map(file => ({
        nome: file.name,
        url: `/docs/simulado/${file.name}`,
      }));
      appendDoc(newDocs);
    }
     event.target.value = ''; // Reset input
  };

  const onSubmit = async (data: FormData) => {
    if (!cliente) return;
    setIsSubmitting(true);
    try {
      const clienteData = {
        ...data,
        documentos: data.documentos?.map(doc => ({
            ...doc,
            dataValidade: doc.dataValidade ? format(doc.dataValidade, 'yyyy-MM-dd') : undefined,
        })) || [],
        observacoes: data.observacoes?.map(obs => obs.value).filter(Boolean) || [],
      };

      await updateCliente(cliente.id, clienteData);
      onClientUpdated();
    } catch (error) {
        console.error("Falha ao atualizar cliente:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível atualizar o cliente. Tente novamente.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize os dados, contatos, observações e documentos do cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[80vh] overflow-y-auto pr-4">
            <SectionTitle>Dados de Identificação</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome / Razão Social</FormLabel>
                    <FormControl><Input placeholder="Ex: João da Silva" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF / CNPJ</FormLabel>
                    <FormControl><Input placeholder="Ex: 123.456.789-00" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
            </div>
            <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Tipo de Cliente</FormLabel>
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex space-x-4">
                      <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PF" /></FormControl><FormLabel className="font-normal">Pessoa Física</FormLabel></FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="PJ" /></FormControl><FormLabel className="font-normal">Pessoa Jurídica</FormLabel></FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            
            <SectionTitle>Contatos</SectionTitle>
            <div className="space-y-3 p-4 border rounded-md">
                {contatoFields.map((field, index) => (
                    <div key={field.id} className="flex items-end gap-2 p-2 border rounded-md">
                        <FormField control={form.control} name={`contatos.${index}.tipo`} render={({ field }) => (
                            <FormItem><FormLabel>Tipo</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="telefone">Telefone</SelectItem><SelectItem value="whatsapp">WhatsApp</SelectItem></SelectContent>
                                </Select>
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name={`contatos.${index}.valor`} render={({ field }) => (
                            <FormItem className="flex-1"><FormLabel>Valor</FormLabel><FormControl><Input placeholder="Digite o contato" {...field}/></FormControl></FormItem>
                        )}/>
                         <FormField control={form.control} name={`contatos.${index}.label`} render={({ field }) => (
                            <FormItem><FormLabel>Rótulo</FormLabel><FormControl><Input placeholder="Ex: Pessoal" {...field}/></FormControl></FormItem>
                        )}/>
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeContato(index)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendContato({ id: `contato-${Date.now()}`, tipo: 'email', valor: '', label: '' })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Contato</Button>
            </div>

            <SectionTitle>Endereços</SectionTitle>
            <div className="space-y-3 p-4 border rounded-md">
                {enderecoFields.map((field, index) => (
                     <div key={field.id} className="space-y-2 p-2 border rounded-md relative">
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeEndereco(index)} className="absolute top-1 right-1 h-7 w-7"><Trash2 className="h-4 w-4" /></Button>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                           <FormField control={form.control} name={`enderecos.${index}.logradouro`} render={({ field }) => (<FormItem><FormLabel>Logradouro</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                           <FormField control={form.control} name={`enderecos.${index}.numero`} render={({ field }) => (<FormItem><FormLabel>Número</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                           <FormField control={form.control} name={`enderecos.${index}.bairro`} render={({ field }) => (<FormItem><FormLabel>Bairro</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                           <FormField control={form.control} name={`enderecos.${index}.cidade`} render={({ field }) => (<FormItem><FormLabel>Cidade</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                           <FormField control={form.control} name={`enderecos.${index}.estado`} render={({ field }) => (<FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                           <FormField control={form.control} name={`enderecos.${index}.cep`} render={({ field }) => (<FormItem><FormLabel>CEP</FormLabel><FormControl><Input {...field}/></FormControl></FormItem>)}/>
                        </div>
                    </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => appendEndereco({ id: `end-${Date.now()}`, logradouro: '', numero: '', bairro: '', cidade: '', estado: '', cep: '' })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Endereço</Button>
            </div>

            <SectionTitle>Observações</SectionTitle>
            <div className="space-y-2 p-4 border rounded-md">
              {obsFields.map((field, index) => (
                <FormField key={field.id} control={form.control} name={`observacoes.${index}.value`} render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center gap-2">
                        <Textarea {...field} placeholder={`Observação #${index + 1}`} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeObs(index)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </FormItem>
                  )} />
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => appendObs({ value: "" })}><PlusCircle className="mr-2 h-4 w-4" />Adicionar Observação</Button>
            </div>

            <SectionTitle>Documentos</SectionTitle>
            <div className="p-4 border rounded-md space-y-4">
                <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
                    <UploadCloud className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">Arraste ou clique para anexar novos documentos</p>
                    <Input type="file" multiple className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={handleFileChange} />
                </div>
                {docFields.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Arquivos Anexados:</p>
                        <ul className="space-y-3">
                            {docFields.map((field, index) => (
                            <li key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border bg-muted/50 p-3 text-sm gap-3">
                                <div className='flex items-center gap-2 overflow-hidden w-full sm:w-auto'><FileIcon className="h-4 w-4 flex-shrink-0" /><span className='truncate font-medium' title={field.nome}>{field.nome}</span></div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <FormField control={form.control} name={`documentos.${index}.dataValidade`} render={({ field: dateField }) => (
                                        <FormItem className="flex-1">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dateField.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {dateField.value ? format(dateField.value, "dd/MM/yyyy") : <span>Validade (opcional)</span>}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dateField.value} onSelect={dateField.onChange} initialFocus /></PopoverContent>
                                            </Popover>
                                        </FormItem>
                                        )} />
                                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => removeDoc(index)}><X className="h-4 w-4" /></Button>
                                </div>
                            </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
            
             <DialogFooter className="sticky bottom-0 bg-background pt-4 z-10">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    