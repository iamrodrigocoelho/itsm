import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Role, UserStatus } from '@itsm/shared-types';

const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  role: z.enum(['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN']),
  status: z.enum(['ATIVO', 'INATIVO']),
  codDominio: z.coerce.number().int().positive(),
  codEmpresa: z.coerce.number().int().positive(),
  codLojaAtual: z.coerce.number().int().positive(),
  cpf: z.string().max(14).optional(),
  telefone: z.string().max(20).optional(),
});

type FormValues = z.infer<typeof schema>;

const ROLE_OPTIONS = [
  { value: 'COLABORADOR', label: 'Colaborador' },
  { value: 'GESTOR', label: 'Gestor' },
  { value: 'ANALISTA_TI', label: 'Analista TI' },
  { value: 'AUDITOR', label: 'Auditor' },
  { value: 'ADMIN', label: 'Admin' },
];

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-body-sm font-medium text-ink mb-spacing-xxs">{label}</label>
      {children}
      {error && <p className="text-caption text-semantic-error mt-spacing-xxs">{error}</p>}
    </div>
  );
}

export function EditarUsuarioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => usersApi.getById(id!),
    enabled: !!id,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: user
      ? {
          nome: user.nome,
          email: user.email,
          role: user.role,
          status: user.status,
          codDominio: user.codDominio,
          codEmpresa: user.codEmpresa,
          codLojaAtual: user.codLojaAtual,
          cpf: user.cpf ?? undefined,
          telefone: user.telefone ?? undefined,
        }
      : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) =>
      usersApi.update(id!, { ...data, role: data.role as Role, status: data.status as UserStatus }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/admin/usuarios');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao atualizar usuário.';
      setServerError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.softDelete(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      navigate('/admin/usuarios');
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao inativar usuário.';
      setServerError(msg);
    },
  });

  if (isLoading) {
    return <div className="p-spacing-xl text-ink-muted text-body-sm">Carregando…</div>;
  }

  if (!user) {
    return (
      <div className="p-spacing-xl">
        <p className="text-semantic-error text-body-sm">Usuário não encontrado.</p>
        <Link to="/admin/usuarios" className="text-ink underline text-body-sm mt-spacing-sm inline-block">
          Voltar
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-spacing-lg max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-spacing-md">
          <Link to="/admin/usuarios" className="text-ink-muted hover:text-ink">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-headline font-semibold text-ink">{user.nome}</h1>
            <p className="text-body-sm text-ink-muted">Matrícula {user.matricula}</p>
          </div>
        </div>

        {user.status === 'ATIVO' && (
          <div className="flex items-center gap-spacing-sm">
            {confirmDelete ? (
              <>
                <span className="text-body-sm text-semantic-error">Confirmar inativação?</span>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="btn-primary bg-semantic-error text-white border-semantic-error"
                >
                  Confirmar
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="btn-secondary">
                  Cancelar
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="btn-secondary flex items-center gap-2 text-semantic-error border-semantic-error"
              >
                <Trash2 size={14} />
                Inativar
              </button>
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit((data) => {
          setServerError('');
          updateMutation.mutate(data);
        })}
        noValidate
        className="bg-surface-1 border border-hairline rounded-lg p-spacing-xl flex flex-col gap-spacing-md"
      >
        <div className="grid grid-cols-2 gap-spacing-md">
          <Field label="Perfil *" error={errors.role?.message}>
            <select className="text-input w-full" {...register('role')}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>

          <Field label="Status *" error={errors.status?.message}>
            <select className="text-input w-full" {...register('status')}>
              <option value="ATIVO">Ativo</option>
              <option value="INATIVO">Inativo</option>
            </select>
          </Field>
        </div>

        <Field label="Nome completo *" error={errors.nome?.message}>
          <input type="text" className="text-input w-full" {...register('nome')} />
        </Field>

        <Field label="E-mail *" error={errors.email?.message}>
          <input type="email" className="text-input w-full" {...register('email')} />
        </Field>

        <div className="grid grid-cols-3 gap-spacing-md">
          <Field label="Cód. Domínio *" error={errors.codDominio?.message}>
            <input type="number" className="text-input w-full" {...register('codDominio')} />
          </Field>
          <Field label="Cód. Empresa *" error={errors.codEmpresa?.message}>
            <input type="number" className="text-input w-full" {...register('codEmpresa')} />
          </Field>
          <Field label="Cód. Loja *" error={errors.codLojaAtual?.message}>
            <input type="number" className="text-input w-full" {...register('codLojaAtual')} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-spacing-md">
          <Field label="CPF" error={errors.cpf?.message}>
            <input type="text" placeholder="000.000.000-00" className="text-input w-full" {...register('cpf')} />
          </Field>
          <Field label="Telefone" error={errors.telefone?.message}>
            <input type="tel" placeholder="(00) 00000-0000" className="text-input w-full" {...register('telefone')} />
          </Field>
        </div>

        {user.managerId && (
          <div className="bg-surface-2 rounded-sm px-spacing-sm py-spacing-xs text-body-sm">
            <span className="text-ink-muted">Gestor: </span>
            <span className="text-ink font-medium">{user.managerNome}</span>
          </div>
        )}

        {serverError && (
          <p className="text-body-sm text-semantic-error bg-semantic-error/5 border border-semantic-error/20 rounded-md px-spacing-sm py-spacing-xs">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-spacing-sm pt-spacing-sm border-t border-hairline-soft">
          <Link to="/admin/usuarios" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting || updateMutation.isPending} className="btn-primary">
            {isSubmitting || updateMutation.isPending ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
