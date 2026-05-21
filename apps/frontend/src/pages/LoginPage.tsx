import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      await login(values.email, values.password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message =
        err instanceof Error && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message ??
            'E-mail ou senha incorretos'
          : 'Erro ao realizar login';
      setServerError(message);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-spacing-md">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="mb-spacing-xl text-center">
          <span className="text-display-md font-medium text-ink tracking-tight">ITSM</span>
          <p className="mt-1 text-body-sm text-ink-muted">Conexão Tech</p>
        </div>

        {/* Card */}
        <div className="bg-surface-1 rounded-lg p-spacing-xl border border-hairline">
          <h1 className="text-headline font-medium text-ink mb-spacing-lg">Entrar</h1>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-spacing-md">
            {/* E-mail */}
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-eyebrow text-ink-muted">
                E-mail corporativo
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="voce@empresa.com.br"
                className={cn(
                  'text-input',
                  errors.email && 'border-semantic-error focus:border-semantic-error',
                )}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-caption text-semantic-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-eyebrow text-ink-muted">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={cn(
                  'text-input',
                  errors.password && 'border-semantic-error focus:border-semantic-error',
                )}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-caption text-semantic-error">{errors.password.message}</p>
              )}
            </div>

            {/* Server error */}
            {serverError && (
              <div className="rounded-md bg-semantic-error/10 border border-semantic-error/30 px-spacing-sm py-2">
                <p className="text-body-sm text-semantic-error">{serverError}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary mt-spacing-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="mt-spacing-lg text-center text-caption text-ink-subtle">
          Acesso restrito à rede interna
        </p>
      </div>
    </div>
  );
}
