export interface FichaPergunta {
  id: string;
  categoria: string;
  label: string;
  tipo: "texto" | "textarea" | "booleano";
}

export const FICHA_CATEGORIAS = [
  "Dados Pessoais",
  "Queixa Principal / Objetivo do Atendimento",
  "Histórico de Procedimentos Estéticos",
  "Antecedentes Médicos",
  "Medicamentos e Alergias",
  "Histórico Familiar",
  "Hábitos de Vida",
  "Cuidados com a Pele Atuais",
  "Saúde Reprodutiva (mulheres)",
  "Saúde Mental",
  "Avaliação Física/Estética",
  "Contraindicações",
  "Consentimento Informado",
] as const;

export const FICHA_PERGUNTAS: FichaPergunta[] = [
  // Dados Pessoais
  { id: "dp_nome", categoria: "Dados Pessoais", label: "Nome completo, data de nascimento, idade", tipo: "texto" },
  { id: "dp_telefone", categoria: "Dados Pessoais", label: "Telefone e email", tipo: "texto" },
  { id: "dp_profissao", categoria: "Dados Pessoais", label: "Profissão", tipo: "texto" },
  { id: "dp_endereco", categoria: "Dados Pessoais", label: "Endereço", tipo: "texto" },

  // Queixa Principal
  { id: "qp_insatisfacao", categoria: "Queixa Principal / Objetivo do Atendimento", label: "Qual é a principal insatisfação estética?", tipo: "textarea" },
  { id: "qp_expectativas", categoria: "Queixa Principal / Objetivo do Atendimento", label: "Expectativas com o tratamento", tipo: "textarea" },

  // Histórico de Procedimentos Estéticos
  { id: "hpe_anteriores", categoria: "Histórico de Procedimentos Estéticos", label: "Procedimentos anteriores realizados (quando, onde, com qual profissional)", tipo: "textarea" },
  { id: "hpe_resultados", categoria: "Histórico de Procedimentos Estéticos", label: "Resultados obtidos", tipo: "textarea" },
  { id: "hpe_complicacoes", categoria: "Histórico de Procedimentos Estéticos", label: "Complicações ou reações adversas", tipo: "textarea" },
  { id: "hpe_produtos", categoria: "Histórico de Procedimentos Estéticos", label: "Produtos estéticos usados regularmente", tipo: "textarea" },

  // Antecedentes Médicos
  { id: "am_doencas", categoria: "Antecedentes Médicos", label: "Doenças atuais (diabetes, hipertensão, problemas de cicatrização)", tipo: "textarea" },
  { id: "am_cirurgias", categoria: "Antecedentes Médicos", label: "Cirurgias anteriores", tipo: "textarea" },
  { id: "am_pele", categoria: "Antecedentes Médicos", label: "Problemas de pele (dermatites, acne, rosácea, vitiligo)", tipo: "textarea" },
  { id: "am_queloides", categoria: "Antecedentes Médicos", label: "Tendência a queloides ou cicatrizes hipertróficas", tipo: "booleano" },
  { id: "am_sensibilidade", categoria: "Antecedentes Médicos", label: "Sensibilidade a medicamentos/produtos", tipo: "textarea" },

  // Medicamentos e Alergias
  { id: "ma_medicamentos", categoria: "Medicamentos e Alergias", label: "Medicamentos em uso (especialmente anticoagulantes, vitaminas, retinóides)", tipo: "textarea" },
  { id: "ma_alergias", categoria: "Medicamentos e Alergias", label: "Alergias conhecidas (iodo, látex, produtos químicos)", tipo: "textarea" },
  { id: "ma_cosmeticos", categoria: "Medicamentos e Alergias", label: "Reações alérgicas a cosméticos", tipo: "textarea" },

  // Histórico Familiar
  { id: "hf_flacidez", categoria: "Histórico Familiar", label: "Tendência a flacidez, rugas ou envelhecimento precoce", tipo: "booleano" },
  { id: "hf_pele", categoria: "Histórico Familiar", label: "Problemas de pele na família", tipo: "textarea" },

  // Hábitos de Vida
  { id: "hv_sol", categoria: "Hábitos de Vida", label: "Exposição solar (frequência, protetor solar)", tipo: "textarea" },
  { id: "hv_tabagismo", categoria: "Hábitos de Vida", label: "Tabagismo e álcool", tipo: "texto" },
  { id: "hv_atividade", categoria: "Hábitos de Vida", label: "Atividade física", tipo: "texto" },
  { id: "hv_sono", categoria: "Hábitos de Vida", label: "Qualidade do sono", tipo: "texto" },
  { id: "hv_hidratacao", categoria: "Hábitos de Vida", label: "Hidratação", tipo: "texto" },

  // Cuidados com a Pele Atuais
  { id: "cp_rotina", categoria: "Cuidados com a Pele Atuais", label: "Rotina de skincare", tipo: "textarea" },
  { id: "cp_produtos", categoria: "Cuidados com a Pele Atuais", label: "Produtos utilizados", tipo: "textarea" },
  { id: "cp_limpeza", categoria: "Cuidados com a Pele Atuais", label: "Frequência de limpeza", tipo: "texto" },
  { id: "cp_protetor", categoria: "Cuidados com a Pele Atuais", label: "Uso de protetor solar", tipo: "booleano" },

  // Saúde Reprodutiva
  { id: "sr_gestante", categoria: "Saúde Reprodutiva (mulheres)", label: "Está gestante ou amamentando?", tipo: "booleano" },
  { id: "sr_contraceptivo", categoria: "Saúde Reprodutiva (mulheres)", label: "Método contraceptivo utilizado", tipo: "texto" },
  { id: "sr_ciclo", categoria: "Saúde Reprodutiva (mulheres)", label: "Ciclo menstrual regular?", tipo: "booleano" },

  // Saúde Mental
  { id: "sm_ansiedade", categoria: "Saúde Mental", label: "Nível de ansiedade/estresse", tipo: "texto" },
  { id: "sm_depressao", categoria: "Saúde Mental", label: "Histórico de depressão", tipo: "booleano" },
  { id: "sm_autoimagem", categoria: "Saúde Mental", label: "Satisfação geral com a autoimagem", tipo: "texto" },

  // Avaliação Física/Estética
  { id: "af_analise", categoria: "Avaliação Física/Estética", label: "Análise da pele (tipo, condições, lesões)", tipo: "textarea" },
  { id: "af_rugas", categoria: "Avaliação Física/Estética", label: "Observação de rugas, flacidez, manchas", tipo: "textarea" },
  { id: "af_foto", categoria: "Avaliação Física/Estética", label: "Fotografia (com consentimento)", tipo: "booleano" },
  { id: "af_simetria", categoria: "Avaliação Física/Estética", label: "Avaliação de simetria facial/corporal", tipo: "textarea" },

  // Contraindicações
  { id: "ci_lesoes", categoria: "Contraindicações", label: "Lesões ativas na pele", tipo: "booleano" },
  { id: "ci_inflamacoes", categoria: "Contraindicações", label: "Inflamações ou infecções", tipo: "booleano" },
  { id: "ci_gravidez", categoria: "Contraindicações", label: "Gravidez/amamentação (conforme procedimento)", tipo: "booleano" },
  { id: "ci_queloides", categoria: "Contraindicações", label: "Histórico de queloides", tipo: "booleano" },
  { id: "ci_autoimunes", categoria: "Contraindicações", label: "Doenças autoimunes ativas", tipo: "booleano" },

  // Consentimento Informado
  { id: "co_explicacao", categoria: "Consentimento Informado", label: "Explicação do procedimento proposto", tipo: "textarea" },
  { id: "co_riscos", categoria: "Consentimento Informado", label: "Possíveis riscos e efeitos colaterais", tipo: "textarea" },
  { id: "co_recuperacao", categoria: "Consentimento Informado", label: "Tempo de recuperação esperado", tipo: "texto" },
  { id: "co_resultados", categoria: "Consentimento Informado", label: "Resultados esperados", tipo: "textarea" },
  { id: "co_assinatura", categoria: "Consentimento Informado", label: "Assinatura de ciência e consentimento", tipo: "booleano" },
];

export function getPerguntasByCategoria(categoria: string) {
  return FICHA_PERGUNTAS.filter((p) => p.categoria === categoria);
}
