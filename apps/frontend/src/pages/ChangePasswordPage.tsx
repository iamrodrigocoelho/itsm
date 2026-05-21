import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/lib/api';
import type { UserSummaryDto } from '@itsm/shared-types';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual obrigatória'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter ao menos uma letra maiúscula')
      .regex(/[a-z]/, 'Deve conter ao menos uma letra minúscula')
      .regex(/[0-9]/, 'Deve conter ao menos um número')
      .regex(/[^A-Za-z0-9]/, 'Deve conter ao menos um caractere especial'),
    confirmPassword: z.string().min(1, 'Confirmação obrigatória'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

interface ChangePasswordPageProps {
  user: UserSummaryDto | null;
  onPasswordChanged: (updated: UserSummaryDto) => void;
}

export function ChangePasswordPage({ user, onPasswordChanged }: ChangePasswordPageProps) {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormValues) => {
    setServerError('');
    try {
      await authApi.changePassword(data.currentPassword, data.newPassword, data.confirmPassword);
      if (user) {
        onPasswordChanged({ ...user, mustChangePassword: false });
      }
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao alterar senha. Tente novamente.';
      setServerError(msg);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-spacing-lg">
      <div className="bg-surface-1 border border-hairline rounded-lg p-spacing-xxl w-full max-w-md">
        <h1 className="text-headline font-semibold text-ink mb-spacing-xs">Alterar senha</h1>
        <p className="text-body-sm text-ink-muted mb-spacing-xl">
          {user?.mustChangePassword
            ? 'É necessário alterar sua senha antes de continuar.'
            : 'Crie uma nova senha segura para sua conta.'}
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-spacing-md">
          <div>
            <label className="block text-body-sm font-medium text-ink mb-spacing-xxs" htmlFor="currentPassword">
              Senha atual
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              className="text-input w-full"
              {...register('currentPassword')}
            />
            {errors.currentPassword && (
              <p className="text-caption text-semantic-error mt-spacing-xxs">{errors.currentPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-body-sm font-medium text-ink mb-spacing-xxs" htmlFor="newPassword">
              Nova senha
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              className="text-input w-full"
              {...register('newPassword')}
            />
            {errors.newPassword && (
              <p className="text-caption text-semantic-error mt-spacing-xxs">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label className="block text-body-sm font-medium text-ink mb-spacing-xxs" htmlFor="confirmPassword">
              Confirmar nova senha
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              className="text-input w-full"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-caption text-semantic-error mt-spacing-xxs">{errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <p className="text-body-sm text-semantic-error bg-semantic-error/5 border border-semantic-error/20 rounded-md px-spacing-sm py-spacing-xs">
              {serverError}
            </p>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full mt-spacing-xs">
            {isSubmitting ? 'Salvando…' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  );
}
