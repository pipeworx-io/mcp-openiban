# mcp-openiban

OpenIBAN MCP — validate an IBAN's checksum + bank code and resolve the

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `validate_iban` | Validate an IBAN: check its checksum and (where supported) its bank code, and resolve the bank name, BIC, and city. Returns whether the IBAN is structurally valid plus bank details when available. Best coverage for EU/DACH banks (DE, NL, BE, CH, AT, LU); for other countries the checksum is still validated but bank details may be empty. IBANs with spaces are accepted (e.g. "DE89 3704 0044 0532 0130 00"). |
| `suggest_iban` | Suggest corrected IBANs for a possibly-mistyped IBAN. Returns a list of candidate IBANs with validity and bank name/BIC. Coverage is limited; if no suggestions are available this returns an error field. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "openiban": {
      "url": "https://gateway.pipeworx.io/openiban/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Openiban data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
