# Keeping Ollama Live

The AI works only when Ollama is running and serving `gemma3:4b` on port `11434`.

## Local Development On Your Mac

Start Ollama:

```bash
ollama serve
```

In another terminal, confirm the model is installed:

```bash
ollama list
```

If `gemma3:4b` is missing:

```bash
ollama pull gemma3:4b
```

Test the local API:

```bash
curl http://127.0.0.1:11434/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"gemma3:4b","prompt":"Reply OK only.","stream":false}'
```

## Easiest Mac Option

Open the Ollama desktop app and keep it running in the menu bar. Set it to open at login if this computer is the AI server.

## Production/VPS Option

On a Linux server, run Ollama as a system service so it survives reboot:

```bash
sudo systemctl enable ollama
sudo systemctl start ollama
sudo systemctl status ollama
```

Then set backend production env:

```env
AI_PROVIDER=ollama
OLLAMA_MODEL=gemma3:4b
OLLAMA_BASE_URL=http://127.0.0.1:11434
```

## Important Security Rule

Do not expose Ollama directly to the public internet. Keep it on `127.0.0.1` or a private network and let only the backend call it.

## Before Hospital Handover

Run:

```bash
bash scripts/production-smoke-test.sh https://hospital-domain.com
```

If the Ollama step fails, AI will not work reliably after handover.
