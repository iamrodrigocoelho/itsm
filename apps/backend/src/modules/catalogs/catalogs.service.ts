import type { PrismaClient } from '@prisma/client';
import { NotFoundError } from '../../shared/errors/AppError.js';
import type { ServiceCatalogDto } from '@itsm/shared-types';
import type { ListCatalogsInput } from './catalogs.schemas.js';

function toCatalogDto(catalog: {
  id: string;
  slug: string;
  nome: string;
  descricao: string;
  categoria: string | null;
  icone: string | null;
  ativo: boolean;
  formSchema: unknown;
  workflow: unknown;
  integration: string | null;
}): ServiceCatalogDto {
  return {
    id: catalog.id,
    slug: catalog.slug,
    nome: catalog.nome,
    descricao: catalog.descricao,
    categoria: catalog.categoria,
    icone: catalog.icone,
    ativo: catalog.ativo,
    formSchema: catalog.formSchema as Record<string, unknown>,
    workflow: catalog.workflow as Record<string, unknown>,
    integration: catalog.integration,
  };
}

export class CatalogsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(input: ListCatalogsInput): Promise<ServiceCatalogDto[]> {
    const where = input.ativo !== undefined ? { ativo: input.ativo } : {};
    const catalogs = await this.prisma.serviceCatalog.findMany({
      where,
      orderBy: { nome: 'asc' },
    });
    return catalogs.map(toCatalogDto);
  }

  async getBySlug(slug: string): Promise<ServiceCatalogDto> {
    const catalog = await this.prisma.serviceCatalog.findUnique({ where: { slug } });
    if (!catalog) throw new NotFoundError('Catálogo', slug);
    return toCatalogDto(catalog);
  }
}
