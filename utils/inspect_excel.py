
import pandas as pd
import os
from pathlib import Path

def inspect():
    file_path = r'c:\Scripts_SBCD\Supabase\rlt1950_Relacao Geral de Funcionarios  Sem Formatacao_06-02-2026_10-54-19.xlsx'
    if not os.path.exists(file_path):
        print(f"Arquivo não encontrado: {file_path}")
        return
    
    try:
        df = pd.read_excel(file_path, nrows=5)
        print("Colunas encontradas:")
        print(df.columns.tolist())
        print("\nExemplo de dados:")
        print(df[['Nome', 'Situação']].to_string())
    except Exception as e:
        print(f"Erro ao ler Excel: {e}")

if __name__ == "__main__":
    inspect()
