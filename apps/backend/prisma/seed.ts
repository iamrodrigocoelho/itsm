import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 12;

const ALTERACAO_LOJA_FORM_SCHEMA = {
  type: 'object',
  required: ['justificativa', 'novaLoja'],
  properties: {
    solicitante: {
      type: 'string',
      title: 'Solicitante',
      readOnly: true,
    },
    lojaAtual: {
      type: 'integer',
      title: 'Loja atual',
      readOnly: true,
    },
    novaLoja: {
      type: 'integer',
      title: 'Nova loja desejada',
      description: 'Selecione a loja para a qual deseja ser transferido',
    },
    justificativa: {
      type: 'string',
      title: 'Justificativa',
      description: 'Descreva o motivo da transferência (mínimo 20 caracteres)',
      minLength: 20,
      maxLength: 500,
    },
    dataEfetivacao: {
      type: 'string',
      format: 'date',
      title: 'Data desejada para efetivação',
      description: 'Deixe em branco para efetivação imediata após aprovação',
    },
  },
};

const ALTERACAO_LOJA_WORKFLOW = {
  steps: [
    {
      id: 'manager-approval',
      name: 'Aprovação do Gestor Direto',
      type: 'approval',
      approver: 'direct_manager',
      requiredComment: false,
      rejectionCommentRequired: true,
      rejectionMinLength: 20,
    },
  ],
};

async function main() {
  console.log('Starting seed...');

  // Admin user
  const adminEmail = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@empresa.com.br';
  const adminPassword = process.env['SEED_ADMIN_PASSWORD'] ?? 'Admin@123456';
  const adminMatricula = process.env['SEED_ADMIN_MATRICULA'] ?? '000001';
  const adminNome = process.env['SEED_ADMIN_NOME'] ?? 'Administrador do Sistema';

  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, BCRYPT_ROUNDS);
    const admin = await prisma.user.create({
      data: {
        matricula: adminMatricula,
        nome: adminNome,
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        status: 'ATIVO',
        codDominio: 1,
        codEmpresa: 1,
        codLojaAtual: 1,
        mustChangePassword: true,
      },
    });
    console.log(`Admin user created: ${admin.email} (id: ${admin.id})`);
    console.log(`⚠️  Temporary password: ${adminPassword} — change it on first login!`);
  } else {
    console.log(`Admin user already exists: ${adminEmail}`);
  }

  // Service catalog: Alteração de Loja
  const existingCatalog = await prisma.serviceCatalog.findUnique({
    where: { slug: 'alteracao-loja' },
  });

  if (!existingCatalog) {
    const catalog = await prisma.serviceCatalog.create({
      data: {
        slug: 'alteracao-loja',
        nome: 'Alteração de Loja do Usuário',
        descricao:
          'Solicite a alteração da filial (loja) vinculada ao seu usuário no sistema CASI. ' +
          'Após aprovação do seu gestor, a alteração é executada automaticamente.',
        categoria: 'Acesso e Permissões',
        icone: 'store',
        ativo: true,
        formSchema: ALTERACAO_LOJA_FORM_SCHEMA,
        workflow: ALTERACAO_LOJA_WORKFLOW,
        integration: 'casi-alterar-loja',
      },
    });
    console.log(`Service catalog created: ${catalog.nome} (slug: ${catalog.slug})`);
  } else {
    console.log(`Service catalog already exists: alteracao-loja`);
  }

  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
