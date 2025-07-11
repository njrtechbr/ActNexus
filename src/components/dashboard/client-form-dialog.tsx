

"use client";

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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
import { createCliente } from '@/services/apiClientLocal';
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

interface ClientFormDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onClientCreated: () => void;
}

export function ClientFormDialog({
  isOpen,
  setIsOpen,
  onClientCreated,
}: ClientFormDialogProps) {
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

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "documentos",
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newDocs = Array.from(files).map(file => ({
        nome: file.name,
        url: `/docs/simulado/${file.name}`, // Simula um caminho
      }));
      append(newDocs);
    }
  };

  const onSubmit = async (data: FormData) => {
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

      await createCliente(clienteData);
      onClientCreated();
      form.reset();
    } catch (error) {
        console.error("Falha ao criar cliente:", error);
        toast({
            variant: "destructive",
            title: "Erro ao Salvar",
            description: "Não foi possível criar o cliente. Tente novamente.",
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) form.reset();
        setIsOpen(open);
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Cliente</DialogTitle>
          <DialogDescription>
            Preencha os dados abaixo para adicionar um novo cliente.
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
                      defaultValue={field.value}
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
                                                        <span>Validade (opcional)</span>
                                                    )}
                                                    </Button>
                                                </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
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
                    Salvar Cliente
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
