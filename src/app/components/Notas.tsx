import { useState } from 'react';
import { useNotas, Nota } from '@/app/hooks/useNotas';
import { useAuth } from '@/app/hooks/useAuth';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

type FilterType = 'todas' | 'abertas' | 'resolvidas';
type PriorityFilter = 'todas' | 'alta' | 'media' | 'baixa';

const CORE_MAP = {
  amarelo: { light: 'bg-yellow-100', dark: 'dark:bg-yellow-900/30', border: 'border-yellow-300' },
  rosa: { light: 'bg-pink-100', dark: 'dark:bg-pink-900/30', border: 'border-pink-300' },
  verde: { light: 'bg-green-100', dark: 'dark:bg-green-900/30', border: 'border-green-300' },
  azul: { light: 'bg-blue-100', dark: 'dark:bg-blue-900/30', border: 'border-blue-300' },
  roxo: { light: 'bg-purple-100', dark: 'dark:bg-purple-900/30', border: 'border-purple-300' },
};

const COR_SOLIDA_MAP = {
  amarelo: 'bg-yellow-300',
  rosa: 'bg-pink-300',
  verde: 'bg-green-300',
  azul: 'bg-blue-300',
  roxo: 'bg-purple-300',
};

const PRIORIDADE_BADGE = {
  alta: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300',
  media: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border border-yellow-300',
  baixa: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 border border-gray-300',
};

interface EditingNota extends Partial<Nota> {
  id?: number;
}

export default function Notas() {
  const { notas, loading, criarNota, atualizarNota, deletarNota, toggleResolvida } = useNotas();
  const { user } = useAuth();

  const [filterType, setFilterType] = useState<FilterType>('todas');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNota, setEditingNota] = useState<EditingNota | null>(null);
  const [formData, setFormData] = useState({
    titulo: '',
    conteudo: '',
    cor: 'amarelo' as const,
    prioridade: 'media' as const,
  });

  const filteredNotas = notas.filter((nota) => {
    // Filtro por status
    if (filterType === 'abertas' && nota.resolvida) return false;
    if (filterType === 'resolvidas' && !nota.resolvida) return false;

    // Filtro por prioridade
    if (priorityFilter !== 'todas' && nota.prioridade !== priorityFilter) return false;

    return true;
  });

  const handleOpenModal = (nota?: Nota) => {
    if (nota) {
      setEditingNota(nota);
      setFormData({
        titulo: nota.titulo,
        conteudo: nota.conteudo || '',
        cor: nota.cor,
        prioridade: nota.prioridade,
      });
    } else {
      setEditingNota(null);
      setFormData({
        titulo: '',
        conteudo: '',
        cor: 'amarelo',
        prioridade: 'media',
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingNota(null);
    setFormData({
      titulo: '',
      conteudo: '',
      cor: 'amarelo',
      prioridade: 'media',
    });
  };

  const handleSaveNota = async () => {
    if (!formData.titulo.trim()) {
      alert('Título é obrigatório');
      return;
    }

    try {
      if (editingNota?.id) {
        await atualizarNota(editingNota.id, {
          titulo: formData.titulo,
          conteudo: formData.conteudo || undefined,
          cor: formData.cor,
          prioridade: formData.prioridade,
        });
      } else {
        await criarNota({
          titulo: formData.titulo,
          conteudo: formData.conteudo || undefined,
          cor: formData.cor,
          prioridade: formData.prioridade,
          autor: user?.nome || 'Anônimo',
        });
      }
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
      alert('Erro ao salvar nota');
    }
  };

  const handleDeleteNota = async (id: number) => {
    if (!confirm('Tem certeza que deseja deletar esta nota?')) return;
    try {
      await deletarNota(id);
    } catch (err) {
      console.error('Erro ao deletar nota:', err);
      alert('Erro ao deletar nota');
    }
  };

  const handleToggleResolvida = async (id: number, resolvida: boolean) => {
    try {
      await toggleResolvida(id, !resolvida);
    } catch (err) {
      console.error('Erro ao atualizar nota:', err);
      alert('Erro ao atualizar nota');
    }
  };

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Notas & Pendências
          </h1>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={() => handleOpenModal()}
                className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4" />
                Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingNota ? 'Editar Nota' : 'Criar Nova Nota'}
                </DialogTitle>
                <DialogDescription>
                  {editingNota
                    ? 'Atualize os detalhes da nota'
                    : 'Crie uma nova nota para compartilhar com o time'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Título */}
                <div>
                  <Label htmlFor="titulo" className="text-sm font-medium">
                    Título *
                  </Label>
                  <Input
                    id="titulo"
                    placeholder="Título da nota"
                    value={formData.titulo}
                    onChange={(e) =>
                      setFormData({ ...formData, titulo: e.target.value })
                    }
                    className="mt-2"
                  />
                </div>

                {/* Conteúdo */}
                <div>
                  <Label htmlFor="conteudo" className="text-sm font-medium">
                    Conteúdo
                  </Label>
                  <Textarea
                    id="conteudo"
                    placeholder="Descreva a nota aqui"
                    value={formData.conteudo}
                    onChange={(e) =>
                      setFormData({ ...formData, conteudo: e.target.value })
                    }
                    className="mt-2 min-h-24"
                  />
                </div>

                {/* Prioridade */}
                <div>
                  <Label htmlFor="prioridade" className="text-sm font-medium">
                    Prioridade
                  </Label>
                  <Select
                    value={formData.prioridade}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        prioridade: value as 'alta' | 'media' | 'baixa',
                      })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="media">Média</SelectItem>
                      <SelectItem value="baixa">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Cores */}
                <div>
                  <Label className="text-sm font-medium">Cor</Label>
                  <div className="flex gap-3 mt-3">
                    {['amarelo', 'rosa', 'verde', 'azul', 'roxo'].map((cor) => (
                      <button
                        key={cor}
                        onClick={() =>
                          setFormData({
                            ...formData,
                            cor: cor as 'amarelo' | 'rosa' | 'verde' | 'azul' | 'roxo',
                          })
                        }
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${
                          COR_SOLIDA_MAP[
                            cor as 'amarelo' | 'rosa' | 'verde' | 'azul' | 'roxo'
                          ]
                        } ${
                          formData.cor === cor
                            ? 'border-slate-900 dark:border-slate-100 scale-110'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Botões */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleCloseModal}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleSaveNota}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingNota ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filtros */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-2 flex-wrap">
            {['todas', 'abertas', 'resolvidas'].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                onClick={() => setFilterType(type as FilterType)}
                size="sm"
                className={
                  filterType === type
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : ''
                }
              >
                {type === 'todas'
                  ? 'Todas'
                  : type === 'abertas'
                    ? 'Em aberto'
                    : 'Resolvidas'}
              </Button>
            ))}
          </div>

          <Select
            value={priorityFilter}
            onValueChange={(value) => setPriorityFilter(value as PriorityFilter)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas Prioridades</SelectItem>
              <SelectItem value="alta">Alta Prioridade</SelectItem>
              <SelectItem value="media">Média Prioridade</SelectItem>
              <SelectItem value="baixa">Baixa Prioridade</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid de Notas */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredNotas.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700">
          <p className="text-slate-500 dark:text-slate-400">
            Nenhuma nota encontrada
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredNotas.map((nota) => {
            const corMap = CORE_MAP[nota.cor];
            return (
              <div
                key={nota.id}
                className={`${corMap.light} ${corMap.dark} border-l-4 ${corMap.border} rounded-lg shadow-md overflow-hidden transition-all hover:shadow-lg ${
                  nota.resolvida ? 'opacity-60' : ''
                }`}
              >
                {/* Barra colorida no topo */}
                <div
                  className={`h-1 ${COR_SOLIDA_MAP[nota.cor]}`}
                ></div>

                {/* Conteúdo */}
                <div className="p-4">
                  {/* Header com badge de prioridade */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3
                      className={`font-bold text-slate-900 dark:text-slate-100 flex-1 ${
                        nota.resolvida ? 'line-through' : ''
                      }`}
                    >
                      {nota.titulo}
                    </h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded whitespace-nowrap ${
                        PRIORIDADE_BADGE[nota.prioridade]
                      }`}
                    >
                      {nota.prioridade === 'alta'
                        ? 'Alta'
                        : nota.prioridade === 'media'
                          ? 'Média'
                          : 'Baixa'}
                    </span>
                  </div>

                  {/* Conteúdo */}
                  {nota.conteudo && (
                    <p className="text-sm text-slate-700 dark:text-slate-300 mb-3 line-clamp-4">
                      {nota.conteudo}
                    </p>
                  )}

                  {/* Footer */}
                  <div className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    <div>{nota.autor}</div>
                    <div>
                      {new Date(nota.criado_em).toLocaleDateString('pt-BR')}
                    </div>
                  </div>

                  {/* Checkbox e Botões */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`check-${nota.id}`}
                      checked={nota.resolvida}
                      onCheckedChange={() =>
                        handleToggleResolvida(nota.id, nota.resolvida)
                      }
                    />
                    <label
                      htmlFor={`check-${nota.id}`}
                      className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex-1"
                    >
                      Resolvida
                    </label>
                    <button
                      onClick={() => handleOpenModal(nota)}
                      className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                    </button>
                    <button
                      onClick={() => handleDeleteNota(nota.id)}
                      className="p-1.5 rounded hover:bg-white/50 dark:hover:bg-slate-700/50 transition-colors"
                      title="Deletar"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
