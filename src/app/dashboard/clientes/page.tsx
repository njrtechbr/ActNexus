
"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getClientes, type Cliente } from '@/services/apiClientLocal';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, Building, Eye, Search, Loader2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Loading from './loading';
import { ClientFormDialog } from '@/components/dashboard/client-form-dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UserProfile {
    role: string;
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [user, setUser] = useState<UserProfile | null>(null);
    const { toast } = useToast();
    const router = useRouter();

    useEffect(() => {
        const userData = localStorage.getItem("actnexus_user");
        if (userData) {
            setUser(JSON.parse(userData));
        }
    }, []);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getClientes();
            setClientes(data);
        } catch (error) {
            console.error("Falha ao buscar clientes:", error);
            toast({
                variant: 'destructive',
                title: 'Erro ao carregar',
                description: 'Não foi possível buscar a lista de clientes.',
            });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleClientCreated = () => {
        setIsFormOpen(false);
        toast({
            title: 'Sucesso!',
            description: 'Novo cliente cadastrado.',
        });
        loadData(); // Recarrega a lista de clientes
    }

    const filteredClientes = useMemo(() => {
        if (!searchTerm) {
            return clientes;
        }
        return clientes.filter(cliente =>
            cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
            cliente.cpfCnpj.replace(/[^\d]/g, '').includes(searchTerm.replace(/[^\d]/g, ''))
        );
    }, [clientes, searchTerm]);

    return (
        <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="font-headline text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
                        <p className="text-muted-foreground">
                            Adicione, consulte e gerencie os clientes do cartório.
                        </p>
                    </div>
                     {user?.role === 'admin' && (
                        <Button onClick={() => setIsFormOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Novo Cliente
                        </Button>
                     )}
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Clientes Cadastrados</CardTitle>
                        <CardDescription>
                            Total de {filteredClientes.length} de {clientes.length} clientes encontrados.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="mb-4">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar por nome ou CPF/CNPJ..."
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
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>Nome / Razão Social</TableHead>
                                        <TableHead>CPF / CNPJ</TableHead>
                                        <TableHead className="w-[100px]">Tipo</TableHead>
                                        <TableHead className="w-[100px] text-right">Docs</TableHead>
                                        <TableHead className="w-[100px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading && (
                                        <TableRow>
                                            <TableCell colSpan={6}>
                                                <div className="flex justify-center p-8 items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="h-5 w-5 animate-spin" />
                                                    <span>Carregando clientes...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {!isLoading && filteredClientes.length > 0 ? (
                                        filteredClientes.map((cliente) => (
                                            <TableRow key={cliente.id}>
                                                <TableCell>
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                                                        {cliente.tipo === 'PF' ? <User className="h-4 w-4 text-muted-foreground" /> : <Building className="h-4 w-4 text-muted-foreground" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium">{cliente.nome}</TableCell>
                                                <TableCell>{cliente.cpfCnpj}</TableCell>
                                                <TableCell>
                                                    <Badge variant={cliente.tipo === 'PF' ? 'secondary' : 'outline'}>{cliente.tipo}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">{cliente.documentos.length}</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => router.push(`/dashboard/clientes/${cliente.id}`)}>
                                                        <Eye className="h-4 w-4" />
                                                        <span className="sr-only">Visualizar Cliente</span>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : null}
                                    {!isLoading && filteredClientes.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center">
                                                Nenhum cliente encontrado.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <ClientFormDialog
                isOpen={isFormOpen}
                setIsOpen={setIsFormOpen}
                onClientCreated={handleClientCreated}
            />
        </>
    );
}
