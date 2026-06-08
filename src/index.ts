interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * OpenIBAN MCP — validate an IBAN's checksum + bank code and resolve the
 * bank name / BIC / city. Keyless wrapper around https://openiban.com.
 *
 * Best bank-data coverage for EU / DACH banks (DE, NL, BE, CH, AT, LU, ...).
 * For other countries the IBAN checksum is still validated, but bankData
 * (name/BIC/city) may be empty.
 */


const BASE = 'https://openiban.com';
const UA = 'pipeworx/1.0 (+https://pipeworx.io)';

const tools: McpToolExport['tools'] = [
  {
    name: 'validate_iban',
    description:
      'Validate an IBAN: check its checksum and (where supported) its bank code, and resolve the bank name, BIC, and city. Returns whether the IBAN is structurally valid plus bank details when available. Best coverage for EU/DACH banks (DE, NL, BE, CH, AT, LU); for other countries the checksum is still validated but bank details may be empty. IBANs with spaces are accepted (e.g. "DE89 3704 0044 0532 0130 00").',
    inputSchema: {
      type: 'object',
      properties: {
        iban: { type: 'string', description: 'The IBAN to validate, e.g. "DE89370400440532013000". Spaces are allowed.' },
      },
      required: ['iban'],
    },
  },
  {
    name: 'suggest_iban',
    description:
      'Suggest corrected IBANs for a possibly-mistyped IBAN. Returns a list of candidate IBANs with validity and bank name/BIC. Coverage is limited; if no suggestions are available this returns an error field.',
    inputSchema: {
      type: 'object',
      properties: {
        iban: { type: 'string', description: 'A possibly-mistyped IBAN, e.g. "DE8937040044053201300". Spaces are allowed.' },
      },
      required: ['iban'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  try {
    switch (name) {
      case 'validate_iban':
        return await validateIban(args);
      case 'suggest_iban':
        return await suggestIban(args);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function normalizeIban(args: Record<string, unknown>): string {
  const raw = typeof args.iban === 'string' ? args.iban : '';
  return raw.replace(/\s+/g, '');
}

async function validateIban(args: Record<string, unknown>): Promise<unknown> {
  const iban = normalizeIban(args);
  if (iban.length < 5) {
    return { error: 'provide an IBAN, e.g. DE89370400440532013000' };
  }
  const url = `${BASE}/validate/${encodeURIComponent(iban)}?getBIC=true&validateBankCode=true`;
  const res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  if (!res.ok) {
    return { error: `OpenIBAN: ${res.status} ${(await res.text()).slice(0, 200)}` };
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { error: 'OpenIBAN: could not parse response' };
  }
  const bankData = data?.bankData;
  const hasBank = bankData && typeof bankData === 'object' && (bankData.bankCode || bankData.name || bankData.bic);
  return {
    valid: Boolean(data?.valid),
    iban: data?.iban ?? iban,
    messages: Array.isArray(data?.messages) ? data.messages : [],
    bank: {
      code: hasBank ? bankData.bankCode || null : null,
      name: hasBank ? bankData.name || null : null,
      bic: hasBank ? bankData.bic || null : null,
      city: hasBank ? bankData.city || null : null,
      zip: hasBank ? bankData.zip || null : null,
    },
    checks: data?.checkResults ?? {},
  };
}

async function suggestIban(args: Record<string, unknown>): Promise<unknown> {
  const iban = normalizeIban(args);
  if (iban.length < 5) {
    return { error: 'provide an IBAN, e.g. DE89370400440532013000' };
  }
  const url = `${BASE}/suggest/${encodeURIComponent(iban)}?getBIC=true`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } });
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
  if (!res.ok) {
    return { error: `OpenIBAN suggest: ${res.status} ${(await res.text()).slice(0, 200)}` };
  }
  let data: any;
  try {
    data = await res.json();
  } catch {
    return { error: 'OpenIBAN suggest: endpoint returned a non-JSON response (suggest may be unavailable)' };
  }
  const result = Array.isArray(data?.result) ? data.result : null;
  if (!result) {
    return { error: 'OpenIBAN suggest: unexpected response shape' };
  }
  return {
    suggestions: result.map((r: any) => ({
      valid: Boolean(r?.valid),
      iban: r?.iban ?? null,
      bank: {
        name: r?.bankData?.name ?? null,
        bic: r?.bankData?.bic ?? null,
      },
    })),
  };
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
