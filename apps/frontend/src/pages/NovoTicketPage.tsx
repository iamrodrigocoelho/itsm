import { useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { catalogsApi, ticketsApi } from '@/lib/api';
import type { UserSummaryDto } from '@itsm/shared-types';

interface Props {
  user: UserSummaryDto;
}

// Renders a single field from the catalog's formSchema
function DynamicField({
  name,
  definition,
  register,
  errors,
  defaultValue,
  readOnly,
}: {
  name: string;
  definition: {
    type?: string;
    title?: string;
    description?: string;
    readOnly?: boolean;
    minLength?: number;
    maxLength?: number;
    format?: string;
  };
  register: ReturnType<typeof useForm>['register'];
  errors: Record<string, { message?: string }>;
  defaultValue?: string | number;
  readOnly?: boolean;
}) {
  const isReadOnly = definition.readOnly ?? readOnly ?? false;
  const label = definition.title ?? name;
  const error = errors[name];

  const inputClasses = [
    'text-input w-full',
    isReadOnly ? 'opacity-60 cursor-not-allowed' : '',
  ].join(' ');

  const validations: Record<string, unknown> = {};
  if (!isReadOnly) {
    if (definition.minLength) {
      validations['minLength'] = {
        value: definition.minLength,
        message: `Mínimo de ${definition.minLength} caracteres`,
      };
    }
    if (definition.maxLength) {
      validations['maxLength'] = {
        value: definition.maxLength,
        message: `Máximo de ${definition.maxLength} caracteres`,
      };
    }
    if (!isReadOnly) {
      validations['required'] = `${label} é obrigatório`;
    }
  }

  if (definition.type === 'string' && definition.format === 'date') {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-body-sm font-medium text-ink">
          {label}
        </label>
        {definition.description && (
          <p className="text-caption text-ink-muted">{definition.description}</p>
        )}
        <input
          type="date"
          readOnly={isReadOnly}
          defaultValue={defaultValue as string | undefined}
          {...register(name, isReadOnly ? {} : validations)}
          className={inputClasses}
        />
        {error && <p className="text-caption text-semantic-error">{error.message}</p>}
      </div>
    );
  }

  if (definition.type === 'string' && (definition.minLength ?? 0) >= 20) {
    return (
      <div className="flex flex-col gap-1">
        <label className="text-body-sm font-medium text-ink">
          {label} <span className="text-semantic-error">*</span>
        </label>
        {definition.description && (
          <p className="text-caption text-ink-muted">{definition.description}</p>
        )}
        <textarea
          rows={4}
          readOnly={isReadOnly}
          defaultValue={defaultValue as string | undefined}
          {...register(name, validations)}
          className={`text-input w-full resize-none ${isReadOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        {error && <p className="text-caption text-semantic-error">{error.message}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-body-sm font-medium text-ink">
        {label}
        {!isReadOnly && <span className="text-semantic-error ml-0.5">*</span>}
      </label>
      {definition.description && (
        <p className="text-caption text-ink-muted">{definition.description}</p>
      )}
      <input
        type={definition.type === 'integer' ? 'number' : 'text'}
        readOnly={isReadOnly}
        defaultValue={defaultValue}
        {...register(name, isReadOnly ? {} : { ...validations, valueAsNumber: definition.type === 'integer' })}
        className={inputClasses}
      />
      {error && <p className="text-caption text-semantic-error">{error.message}</p>}
    </div>
  );
}

export function NovoTicketPage({ user }: Props) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const { data: catalog, isLoading, isError } = useQuery({
    queryKey: ['catalog', slug],
    queryFn: () => catalogsApi.getBySlug(slug!),
    enabled: !!slug,
  });

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<Record<string, unknown>>();

  useEffect(() => {
    if (catalog) {
      // Pre-fill read-only fields from user data
      setValue('solicitante', user.nome);
      setValue('lojaAtual', user.codLojaAtual);
    }
  }, [catalog, user, setValue]);

  const mutation = useMutation({
    mutationFn: (formData: Record<string, unknown>) =>
      ticketsApi.create({ catalogSlug: slug!, formData }),
    onSuccess: (ticket) => {
      navigate(`/tickets/${ticket.id}`);
    },
  });

  const onSubmit = handleSubmit((data) => {
    mutation.mutate(data);
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-spacing-xl">
        <Loader2 size={24} className="animate-spin text-ink-muted" />
      </div>
    );
  }

  if (isError || !catalog) {
    return (
      <div className="flex flex-col gap-spacing-md">
        <Link to="/catalogo" className="btn-tertiary flex items-center gap-1.5 w-fit">
          <ChevronLeft size={14} />
          Voltar ao catálogo
        </Link>
        <p className="text-body text-semantic-error">Serviço não encontrado.</p>
      </div>
    );
  }

  const schema = catalog.formSchema as {
    properties?: Record<string, {
      type?: string;
      title?: string;
      description?: string;
      readOnly?: boolean;
      minLength?: number;
      maxLength?: number;
      format?: string;
    }>;
    required?: string[];
  };

  const properties = schema.properties ?? {};
  // Separate read-only from editable fields
  const readOnlyFields = Object.entries(properties).filter(([, def]) => def.readOnly);
  const editableFields = Object.entries(properties).filter(([, def]) => !def.readOnly);

  return (
    <div className="flex flex-col gap-spacing-lg max-w-content">
      <div className="flex items-center gap-spacing-sm">
        <Link to="/catalogo" className="btn-tertiary flex items-center gap-1 px-spacing-xs py-1 text-caption">
          <ChevronLeft size={14} />
          Catálogo
        </Link>
        <span className="text-ink-muted text-caption">/</span>
        <span className="text-caption text-ink">{catalog.nome}</span>
      </div>

      <div>
        <h1 className="text-headline font-semibold text-ink">{catalog.nome}</h1>
        <p className="text-body-sm text-ink-muted mt-1">{catalog.descricao}</p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-spacing-lg">
        {readOnlyFields.length > 0 && (
          <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-spacing-md">
            <h2 className="text-subhead font-medium text-ink">Dados do solicitante</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-spacing-md">
              {readOnlyFields.map(([name, def]) => (
                <DynamicField
                  key={name}
                  name={name}
                  definition={def}
                  register={register}
                  errors={errors as Record<string, { message?: string }>}
                  defaultValue={
                    name === 'solicitante'
                      ? user.nome
                      : name === 'lojaAtual'
                      ? user.codLojaAtual
                      : undefined
                  }
                  readOnly
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-surface-1 rounded-lg border border-hairline p-spacing-lg flex flex-col gap-spacing-md">
          <h2 className="text-subhead font-medium text-ink">Detalhes do chamado</h2>
          <div className="flex flex-col gap-spacing-md">
            {editableFields.map(([name, def]) => (
              <DynamicField
                key={name}
                name={name}
                definition={def}
                register={register}
                errors={errors as Record<string, { message?: string }>}
              />
            ))}
          </div>
        </div>

        {mutation.isError && (
          <div className="bg-semantic-error/10 border border-semantic-error/30 rounded-md p-spacing-sm text-body-sm text-semantic-error">
            {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              'Erro ao abrir chamado. Tente novamente.'}
          </div>
        )}

        <div className="flex items-center justify-end gap-spacing-sm">
          <Link to="/catalogo" className="btn-secondary">
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-60"
          >
            {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
            Abrir chamado
          </button>
        </div>
      </form>
    </div>
  );
}
