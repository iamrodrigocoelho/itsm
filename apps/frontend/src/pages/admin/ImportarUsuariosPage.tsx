import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { usersApi } from '@/lib/api';
import type { CsvImportJobDto } from '@itsm/shared-types';

const EXAMPLE_CSV = `matricula,nome,email,role,codDominio,codEmpresa,codLojaAtual,cpf,telefone
000010,Ana Lima,ana@empresa.com,COLABORADOR,1,1,5,,
000011,Carlos Souza,carlos@empresa.com,GESTOR,1,1,3,000.000.000-01,(11) 99999-0001`;

export function ImportarUsuariosPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CsvImportJobDto | null>(null);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.endsWith('.csv')) {
        setError('Apenas arquivos .csv são aceitos.');
        return;
      }
      if (selected.size > 2 * 1024 * 1024) {
        setError('O arquivo não pode ultrapassar 2 MB.');
        return;
      }
      setFile(selected);
      setError('');
      setResult(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const content = await file.text();
      const job = await usersApi.importCsv({ filename: file.name, content });
      setResult(job);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao processar importação.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const errorRows = Array.isArray((result?.errorReport as unknown[])) ? (result?.errorReport as Array<{ row: number; error: string }>) : [];

  return (
    <div className="flex flex-col gap-spacing-lg max-w-2xl">
      <div className="flex items-center gap-spacing-md">
        <Link to="/admin/usuarios" className="text-ink-muted hover:text-ink">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-headline font-semibold text-ink">Importar usuários via CSV</h1>
      </div>

      <div className="bg-surface-1 border border-hairline rounded-lg p-spacing-xl flex flex-col gap-spacing-lg">
        <div>
          <h2 className="text-subhead font-medium text-ink mb-spacing-xs">Formato esperado</h2>
          <p className="text-body-sm text-ink-muted mb-spacing-sm">
            Colunas obrigatórias: <code className="bg-surface-2 px-1 rounded-xs text-mono">matricula</code>,{' '}
            <code className="bg-surface-2 px-1 rounded-xs text-mono">nome</code>,{' '}
            <code className="bg-surface-2 px-1 rounded-xs text-mono">email</code>,{' '}
            <code className="bg-surface-2 px-1 rounded-xs text-mono">codDominio</code>,{' '}
            <code className="bg-surface-2 px-1 rounded-xs text-mono">codEmpresa</code>,{' '}
            <code className="bg-surface-2 px-1 rounded-xs text-mono">codLojaAtual</code>.
            Limite: 500 linhas, 2 MB.
          </p>
          <pre className="bg-surface-2 rounded-sm p-spacing-sm text-mono text-caption overflow-x-auto border border-hairline-soft">
            {EXAMPLE_CSV}
          </pre>
        </div>

        <div>
          <h2 className="text-subhead font-medium text-ink mb-spacing-sm">Selecionar arquivo</h2>

          <div
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
            tabIndex={0}
            role="button"
            className="border-2 border-dashed border-hairline rounded-lg p-spacing-xl text-center cursor-pointer hover:border-ink-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <Upload size={24} className="mx-auto text-ink-muted mb-spacing-xs" />
            {file ? (
              <p className="text-body-sm text-ink font-medium">{file.name}</p>
            ) : (
              <p className="text-body-sm text-ink-muted">Clique para selecionar um arquivo .csv</p>
            )}
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              className="sr-only"
              onChange={handleFileChange}
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-spacing-xs text-semantic-error bg-semantic-error/5 border border-semantic-error/20 rounded-md px-spacing-sm py-spacing-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="text-body-sm">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleImport}
          disabled={!file || loading}
          className="btn-primary self-start flex items-center gap-2 disabled:opacity-40"
        >
          <Upload size={14} />
          {loading ? 'Importando…' : 'Iniciar importação'}
        </button>
      </div>

      {result && (
        <div className="bg-surface-1 border border-hairline rounded-lg p-spacing-xl">
          <div className="flex items-center gap-spacing-xs mb-spacing-md">
            <CheckCircle size={18} className="text-semantic-success" />
            <h2 className="text-subhead font-medium text-ink">Resultado da importação</h2>
          </div>

          <div className="grid grid-cols-3 gap-spacing-md mb-spacing-md">
            <div className="bg-surface-2 rounded-sm p-spacing-sm text-center">
              <p className="text-display-md font-semibold text-ink">{result.totalRows}</p>
              <p className="text-body-sm text-ink-muted">Total</p>
            </div>
            <div className="bg-surface-2 rounded-sm p-spacing-sm text-center">
              <p className="text-display-md font-semibold text-semantic-success">{result.successRows}</p>
              <p className="text-body-sm text-ink-muted">Sucesso</p>
            </div>
            <div className="bg-surface-2 rounded-sm p-spacing-sm text-center">
              <p className="text-display-md font-semibold text-semantic-error">{result.errorRows}</p>
              <p className="text-body-sm text-ink-muted">Erros</p>
            </div>
          </div>

          {errorRows.length > 0 && (
            <div>
              <h3 className="text-body-sm font-medium text-ink mb-spacing-xs">Linhas com erro</h3>
              <div className="border border-hairline rounded-sm overflow-hidden">
                <table className="w-full text-body-sm">
                  <thead className="bg-surface-2 border-b border-hairline">
                    <tr>
                      <th className="px-spacing-sm py-spacing-xs text-left font-medium text-ink-muted">Linha</th>
                      <th className="px-spacing-sm py-spacing-xs text-left font-medium text-ink-muted">Erro</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorRows.map((e, i) => (
                      <tr key={i} className="border-b border-hairline-soft last:border-0">
                        <td className="px-spacing-sm py-spacing-xs text-ink font-mono">{e.row}</td>
                        <td className="px-spacing-sm py-spacing-xs text-semantic-error">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
