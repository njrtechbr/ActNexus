"use client";

import { useState, useEffect } from 'react';
import { getClientes, type Cliente } from '@/services/apiClientLocal';
import { Button } from '@/components/ui/button';
import { PlusCircle, User, Building } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import Loading from './loading';

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadData() {
            try {
                const data = await getClientes();
                setClientes(data);
            } catch (error) {
                console.error("Falha ao buscar clientes:", error);
            } finally {
                setIsLoading(false);
            }
        }
        loadData();
    }, []);

    if (isLoading) {
        return <Loading />;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="font-headline text-3xl font-bold tracking-tight">Gestão de Clientes</h1>
                    <p className="text-muted-foreground">
                        Adicione, consulte e gerencie os clientes do cartório.
                    </p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Novo Cliente
                </Button>
            </div>

             <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12"></TableHead>
                            <TableHead>Nome / Razão Social</TableHead>
                            <TableHead>CPF / CNPJ</TableHead>
                            <TableHead className="w-[100px]">Tipo</TableHead>
                            <TableHead className="w-[100px] text-right">Documentos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {clientes.length > 0 ? (
                            clientes.map((cliente) => (
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
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    Nenhum cliente encontrado.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
