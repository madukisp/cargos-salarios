
import os
import json
import requests
from dotenv import load_dotenv

# Carregar váriáveis do projeto local
load_dotenv('.env.local')

SUPABASE_URL_NEW = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY_NEW = os.getenv("VITE_SUPABASE_ANON_KEY")

# Projeto Antigo (hardcoded para migração única)
SUPABASE_URL_OLD = "https://xwztnhlcafgcffozwxyg.supabase.co"
SUPABASE_KEY_OLD = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3enRuaGxjYWZnY2Zmb3p3eHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTE0MjcsImV4cCI6MjA4Mzg4NzQyN30.EcDv-vR9jG-Bcvxwptb2PUYNkw1vA8rY4b-1a8tubJ8"

def get_all_data(url, key, table):
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}"
    }
    
    # Mapeamento de colunas de ID para ordenação correta na paginação
    id_cols = {
        'eventos_movimentacao': 'id_evento',
        'respostas_gestor': 'id_resposta',
        'substitutos_vaga': 'id',
        'vagas_analista': 'id',
        'candidatos': 'id'
    }
    id_col = id_cols.get(table, 'id')
    
    all_data = []
    page = 0
    limit = 1000
    
    print(f"📥 Buscando dados de {table}...")
    while True:
        offset = page * limit
        r = requests.get(
            f"{url}/rest/v1/{table}?limit={limit}&offset={offset}&order={id_col}.asc", 
            headers=headers
        )
        if r.status_code == 200:
            data = r.json()
            if not data:
                break
            all_data.extend(data)
            print(f"   > Coletados {len(all_data)} registros...")
            if len(data) < limit:
                break
            page += 1
        else:
            print(f"❌ Erro ao buscar {table}: {r.status_code} - {r.text}")
            break
    return all_data

def post_data(url, key, table, data):
    if not data:
        print(f"ℹ️ Sem dados para migrar em {table}.")
        return
        
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates"
    }
    
    batch_size = 100
    total = len(data)
    print(f"📤 Enviando {total} registros para {table}...")
    
    for i in range(0, total, batch_size):
        batch = data[i:i+batch_size]
        r = requests.post(f"{url}/rest/v1/{table}", headers=headers, json=batch)
        if r.status_code in [200, 201]:
            if (i + batch_size) % 500 == 0 or (i + batch_size) >= total:
                print(f"   ✅ Processados {min(i + batch_size, total)}/{total}")
        else:
            print(f"   ❌ Erro no lote {i}: {r.status_code} - {r.text}")

def main():
    print("🚀 Iniciando migração COMPLETA de dados entre projetos Supabase...")
    
    # Ordem de migração para manter integridade (se houver FKs ativas)
    tabelas = [
        "eventos_movimentacao",
        "respostas_gestor",
        "substitutos_vaga",
        "vagas_analista",
        "candidatos"
    ]
    
    for tabela in tabelas:
        print("-" * 30)
        data = get_all_data(SUPABASE_URL_OLD, SUPABASE_KEY_OLD, tabela)
        post_data(SUPABASE_URL_NEW, SUPABASE_KEY_NEW, tabela, data)

    print("\n" + "="*30)
    print("✨ Migração total concluída!")
    print("="*30)

if __name__ == "__main__":
    main()
