
import pandas as pd
import os

def check_maria_jussara():
    file_path = r'c:\Scripts_SBCD\Supabase\rlt1950_Relacao Geral de Funcionarios  Sem Formatacao_06-02-2026_10-54-19.xlsx'
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
    
    df = pd.read_excel(file_path)
    # Procurar por Maria Jussara
    mask = df['Nome'].str.contains('MARIA JUSSARA', case=False, na=False)
    result = df[mask]
    
    if result.empty:
        print("Maria Jussara not found in Excel.")
    else:
        print("Found in Excel:")
        cols_to_show = ['ID', 'Nome', 'Situação', 'Dt Início Situação']
        # Check if columns exist
        existing_cols = [c for c in cols_to_show if c in df.columns]
        print(result[existing_cols].to_string())

if __name__ == "__main__":
    check_maria_jussara()
