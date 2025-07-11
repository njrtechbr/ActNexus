
"use client";

import { useState, useEffect } from 'react';
import { getClienteById, getAtosByClienteId, type Cliente, type Ato } from '@/services/apiClientLocal';
import { useParams, useRouter } from 'next/navigation';
import Loading from './loading';
import { Button } from '@/components/ui/button';
import { ArrowLeft, User, Building, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function DetalhesClientePage() {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [atos, setAtos] = useState<Ato[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const params = useParams();
    const router = useRouter();
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

    if (isLoading) {
        return <Loading />;
    }

    if (!cliente) {
        return <div className="text-center p-8">Cliente não encontrado.</div>;
    }

    return (
        <div className="space-y-6">
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

            <div className="grid gap-6 md:grid-cols-3">
                <Card className="md:col-span-1">
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

                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Atos Vinculados</CardTitle>
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
                                        <TableHead>Ato Nº</TableHead>
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
