
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';

export function Settings() {
    const { user, changePassword } = useAuth();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (newPassword !== confirmPassword) {
            toast.error('As senhas não coincidem');
            setLoading(false);
            return;
        }

        if (newPassword.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            setLoading(false);
            return;
        }

        try {
            // @ts-ignore - changePassword might not be in the type definition if it wasn't updated
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                toast.success('Senha alterada com sucesso');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(result.error || 'Erro ao alterar senha');
            }
        } catch (error) {
            toast.error('Ocorreu um erro ao alterar a senha');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Configurações</h2>
                <p className="text-slate-500 dark:text-slate-400">Gerencie suas preferências e segurança.</p>
            </div>

            <div className="grid gap-6">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Segurança</CardTitle>
                        <CardDescription>Alterar sua senha de acesso ao sistema.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="current-password">Senha Atual</Label>
                                <Input
                                    id="current-password"
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    placeholder="Digite sua senha atual"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="new-password">Nova Senha</Label>
                                <Input
                                    id="new-password"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Digite a nova senha"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirme a nova senha"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <Button type="submit" disabled={loading}>
                                    {loading ? 'Alterando...' : 'Alterar Senha'}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Perfil</CardTitle>
                        <CardDescription>Informações da sua conta.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Nome</Label>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                                        {user?.nome || 'N/A'}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-md text-sm">
                                        {user?.email || 'N/A'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
