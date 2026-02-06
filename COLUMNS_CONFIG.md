# Configuração de Colunas - Oris Funcionários

Selecione as colunas que você deseja exibir na tabela. Marque as que quer manter e deixe em branco as que quer remover.

## Instruções

1. Marque `[x]` nas colunas que você quer exibir
2. Deixe `[ ]` nas que quer remover
3. Após seleção, você poderá renomear as colunas entre parênteses
4. Salve este arquivo e notifique para criar a configuração

---

## Dados Pessoais

- [X] **id** (ID)
- [X] **nome** (Nome)
- [X] cpf (CPF)
- [ ] matricula (Matrícula)
- [X] nascimento (Data Nascimento)
- [X] sexo (Sexo)
- [ ] rg (RG)
- [ ] data_emissao_rg (Data Emissão RG)
- [ ] orgao_emissor (Órgão Emissor RG)
- [ ] uf_rg (UF RG)
- [ ] estado_civil (Estado Civil)
- [ ] raca_cor (Raça/Cor)
- [ ] grau_instrucao (Grau Instrução)
- [ ] nome_pai (Nome Pai)
- [ ] nome_mae (Nome Mãe)
- [ ] nacionalidade (Nacionalidade)
- [ ] naturalidade (Naturalidade)

---

## Endereço

- [ ] endereco (Endereço)
- [ ] numero (Número)
- [ ] complemento (Complemento)
- [ ] bairro (Bairro)
- [ ] cidade (Cidade)
- [ ] uf (UF)
- [ ] cep (CEP)

---

## Contato

- [ ] email (Email Corporativo)
- [ ] celular (Celular)
- [ ] telefone_residencial (Telefone Residencial)
- [ ] email_pessoal (Email Pessoal)
- [ ] telefone_celular (Telefone Celular)

---

## Cargo e Função

- [X] **cargo** (Cargo)
- [X] cargo_codigo (Código Cargo)
- [X] funcao (Função)
- [X] cbo (CBO)
- [X] descricao_cbo (Descrição CBO)
- [X] tipo_funcionario (Tipo Funcionário)
- [X] motivo_cargo (Motivo Cargo)

---

## Empresa/Contrato

- [ ] **empresa** (Empresa)
- [X] **nome_fantasia** (Fantasia)
- [ ] cnpj_empresa (CNPJ)
- [ ] razao_social (Razão Social)

---

## Lotação e Centro de Custo

- [X] **lotacao** (Lotação)
- [X] **centro_custo** (Centro Custo)
- [ ] centro_custo_codigo (Código Centro Custo)
- [X] **local_trabalho** (Local Trabalho)

---

## Escala e Carga Horária

- [ ] escala_codigo (Código Escala)
- [X] escala (Escala)
- [X] carga_horaria_mensal (Carga Horária Mensal)
- [X] carga_horaria_semanal (Carga Horária Semanal)

---

## Datas Importantes

- [X] admissao (Admissão)
- [X] data_rescisao (Data Rescisão)
- [X] situacao_atual (Situação Atual)
- [X] data_inicio_situacao (Início Situação)
- [X] data_inicio_cargo (Início Cargo)
- [X] data_inicio_centro_custo (Início Centro Custo)
- [X] data_inicio_escala (Início Escala)
- [X] data_inicio_lotacao (Início Lotação)
- [X] **situacao** (Situação) - 01-ATIVO

---

## Documentos Complementares

- [ ] titulo_eleitor (Título Eleitor)
- [ ] zona_eleitoral (Zona Eleitoral)
- [ ] secao_eleitoral (Seção Eleitoral)
- [ ] ctps (CTPS)
- [ ] serie_ctps (Série CTPS)
- [ ] uf_ctps (UF CTPS)
- [ ] pis (PIS)
- [ ] cnh (CNH)
- [ ] categoria_cnh (Categoria CNH)
- [ ] validade_cnh (Validade CNH)
- [ ] numero_sus (Número SUS)
- [ ] conselho_regional (Conselho Regional)
- [ ] numero_conselho (Número Conselho)

---

## Informações Especiais

- [X] pcd (PCD)
- [X] pcd_descricao (Descrição PCD)
- [X] pcd_reabilitado (PCD Reabilitado)
- [X] demitido (Demitido)
- [X] tipo_rescisao (Tipo Rescisão)

---

## Dados Bancários

- [ ] banco_codigo (Código Banco)
- [ ] agencia (Agência)
- [ ] conta (Conta)

---

## Sindicato

- [X] sindicato_codigo (Código Sindicato)
- [X] sindicato (Sindicato)

---

## Vaga/Posição

- [X] vaga (Vaga)
- [X] mao_de_obra (Mão de Obra)

---

## Controle

- [ ] atualizado_em (Atualizado em)
- [ ] tipo_admissao (Tipo Admissão)
- [ ] codigo_cargo (Código Cargo)

---

## Resumo

**Colunas Selecionadas (7):**

1. id
2. nome
3. cargo
4. empresa
5. nome_fantasia
6. lotacao
7. centro_custo
8. local_trabalho
9. situacao

---

> Após salvar suas seleções, rode o comando: `/gerar-config` para criar o arquivo de configuração.
