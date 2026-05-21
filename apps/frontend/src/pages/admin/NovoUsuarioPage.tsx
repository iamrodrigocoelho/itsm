import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft } from 'lucide-react';
import { usersApi } from '@/lib/api';
import { Role } from '@itsm/shared-types';

const schema = z.object({
  matricula: z.string().min(1, 'Obrigatório').max(20),
  nome: z.string().min(2, 'Mínimo 2 caracteres').max(100),
  email: z.string().email('E-mail inválido'),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter maiúscula')
    .regex(/[a-z]/, 'Deve conter minúscula')
    .regex(/[0-9]/, 'Deve conter número')
    .regex(/[^A-Za-z0-9]/, 'Deve conter caractere especial'),
  role: z.enum(['COLABORADOR', 'GESTOR', 'ANALISTA_TI', 'AUDITOR', 'ADMIN']),
  codDominio: z.coerce.number().int().positive('Obrigatório'),
  codEmpresa: z.coerce.number().int().positive('Obrigatório'),
  codLojaAtual: z.coerce.number().int().positive('Obrigatório'),
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

export function NovoUsuarioPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'COLABORADOR', codDominio: 1, codEmpresa: 1, codLojaAtual: 1 },
  });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      await usersApi.create({ ...data, role: data.role as Role });
      navigate('/admin/usuarios');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar usuário. Tente novamente.';
      setServerError(msg);
    }
  };

  return (
    <div className="flex flex-col gap-spacing-lg max-w-2xl">
      <div className="flex items-center gap-spacing-md">
        <Link to="/admin/usuarios" className="text-ink-muted hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-headline font-semibold text-ink">Novo usuário</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="bg-surface-1 border border-hairline rounded-lg p-spacing-xl flex flex-col gap-spacing-md">
        <div className="grid grid-cols-2 gap-spacing-md">
          <Field label="Matrícula *" error={errors.matricula?.message}>
            <input type="text" className="text-input w-full" {...register('matricula')} />
          </Field>

          <Field label="Perfil *" error={errors.role?.message}>
            <select className="text-input w-full" {...register('role')}>
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Nome completo *" error={errors.nome?.message}>
          <input type="text" className="text-input w-full" {...register('nome')} />
        </Field>

        <Field label="E-mail *" error={errors.email?.message}>
          <input type="email" className="text-input w-full" {...register('email')} />
        </Field>

        <Field label="Senha inicial *" error={errors.password?.message}>
          <input type="password" autoComplete="new-password" className="text-input w-full" {...register('password')} />
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

        {serverError && (
          <p className="text-body-sm text-semantic-error bg-semantic-error/5 border border-semantic-error/20 rounded-md px-spacing-sm py-spacing-xs">
            {serverError}
          </p>
        )}

        <div className="flex justify-end gap-spacing-sm pt-spacing-sm border-t border-hairline-soft">
          <Link to="/admin/usuarios" className="btn-secondary">
            Cancelar
          </Link>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? 'Criando…' : 'Criar usuário'}
          </button>
        </div>
      </form>
    </div>
  );
}
