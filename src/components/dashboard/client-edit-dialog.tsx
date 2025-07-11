
"use client";

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO } from 'date-fns';
import { Loader2, UploadCloud, File as FileIcon, X, CalendarIcon } from 'lucide-react';
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
import { updateCliente, type Cliente, type DocumentoCliente } from '@/services/apiClientLocal';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

const documentoSchema = z.object({
  nome: z.string(),
  url: z.string(),
  dataValidade: z.date().optional(),
});

const formSchema = z.object({
  nome: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  cpfCnpj: z.string().min(11, { message: 'CPF/CNPJ inválido.' }),
  tipo: z.enum(['PF', 'PJ'], { required_error: 'Selecione o tipo de cliente.' }),
  documentos: z.array(documentoSchema).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface ClientEditDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClientUpdated: () => void;
  cliente: Cliente;
}

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
    defaultValues: {
      nome: '',
      cpfCnpj: '',
      tipo: 'PF',
      documentos: [],
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "documentos",
  });
  
  useEffect(() => {
    if (cliente && isOpen) {
      form.reset({
        nome: cliente.nome,
        cpfCnpj: cliente.cpfCnpj,
        tipo: cliente.tipo,
      });
      // Convert string dates back to Date objects for the form
      const formDocs = cliente.documentos?.map(doc => ({
          ...doc,
          dataValidade: doc.dataValidade ? parseISO(doc.dataValidade) : undefined,
      })) || [];
      replace(formDocs);
    }
  }, [cliente, isOpen, form, replace]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocs = Array.from(files).map(file => ({
        nome: file.name,
        url: `/docs/simulado/${file.name}`, // Simula um caminho
      }));
      append(newDocs);
    }
     event.target.value = ''; // Reset input
  };

  const onSubmit = async (data: FormData) => {
    if (!cliente) return;
    setIsSubmitting(true);
    try {
      // Formata as datas antes de enviar
      const clienteData = {
        ...data,
        documentos: data.documentos?.map(doc => ({
            ...doc,
            dataValidade: doc.dataValidade ? format(doc.dataValidade, 'yyyy-MM-dd') : undefined,
        })) || [],
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>
            Atualize os dados e gerencie os documentos do cliente.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome / Razão Social</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="cpfCnpj"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>CPF / CNPJ</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: 123.456.789-00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Tipo de Cliente</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PF" />
                        </FormControl>
                        <FormLabel className="font-normal">Pessoa Física</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <RadioGroupItem value="PJ" />
                        </FormControl>
                        <FormLabel className="font-normal">Pessoa Jurídica</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
                <FormLabel>Documentos</FormLabel>
                <FormControl>
                    <div className="relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-6 text-center">
                        <UploadCloud className="h-10 w-10 text-muted-foreground" />
                        <p className="mt-2 text-sm text-muted-foreground">Arraste ou clique para anexar novos documentos</p>
                        <Input 
                            type="file" 
                            multiple 
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            onChange={handleFileChange}
                        />
                    </div>
                </FormControl>
            </FormItem>
            
            {fields.length > 0 && (
                <div className="space-y-2">
                    <p className="text-sm font-medium">Arquivos Anexados:</p>
                    <ul className="space-y-3">
                        {fields.map((field, index) => (
                           <li key={field.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-md border bg-muted/50 p-3 text-sm gap-3">
                                <div className='flex items-center gap-2 overflow-hidden w-full sm:w-auto'>
                                    <FileIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className='truncate font-medium' title={field.nome}>{field.nome}</span>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <FormField
                                        control={form.control}
                                        name={`documentos.${index}.dataValidade`}
                                        render={({ field: dateField }) => (
                                        <FormItem className="flex-1">
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full justify-start text-left font-normal",
                                                        !dateField.value && "text-muted-foreground"
                                                    )}
                                                    >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dateField.value ? (
                                                        format(dateField.value, "dd/MM/yyyy")
                                                    ) : (
                                                        <span>Validade (opcional)</span>
                                                    )}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={dateField.value}
                                                    onSelect={dateField.onChange}
                                                    initialFocus
                                                />
                                                </PopoverContent>
                                            </Popover>
                                        </FormItem>
                                        )}
                                    />
                                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => remove(index)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                           </li>
                        ))}
                    </ul>
                </div>
            )}
            
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
