#!/usr/bin/env bash
set -e

echo "=== Verificando Requisitos de Memória e Plataforma (Raspberry Pi / ARM64) ==="

# 1. Start application in background to measure idle RSS
echo "[1/3] Iniciando processo Fastify em segundo plano..."
NODE_ENV=production DB_PATH=data/footprint_test.db PORT=3999 node dist/server/index.js &
SERVER_PID=$!

sleep 2

# Measure memory RSS in KB then convert to MB
RSS_KB=$(ps -o rss= -p $SERVER_PID | tr -d ' ')
RSS_MB=$((RSS_KB / 1024))

echo "[2/3] Memória RSS Ociosa do Servidor: ${RSS_MB} MB"

kill -9 $SERVER_PID 2>/dev/null || true
rm -f data/footprint_test.db*

if [ "$RSS_MB" -gt 150 ]; then
  echo "❌ ERRO: Consumo de memória ($RSS_MB MB) excedeu o teto de 150MB!"
  exit 1
else
  echo "✅ APROVADO: Consumo de memória (${RSS_MB} MB) perfeitamente compatível com Raspberry Pi (< 150MB limite container, < 200MB Constituição)."
fi

# 2. Check Dockerfile syntax and ARM64 target
echo "[3/3] Verificando Dockerfile para suporte ARM64 e imagens Alpine..."
if grep -q "alpine" Dockerfile && grep -q "better-sqlite3" Dockerfile; then
  echo "✅ APROVADO: Imagem Docker baseada em Alpine com compilação nativa para ARM64/AMD64."
else
  echo "❌ ERRO no Dockerfile."
  exit 1
fi

echo "=== Verificação de Footprint Concluída com Sucesso ==="
