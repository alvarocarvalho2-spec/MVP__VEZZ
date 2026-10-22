# V3 — auditoria e plano de pós-produção

## Evidência e escopo

Antes de alterar a composição, `review.mjs` reproduziu integralmente o MP4 existente no Chrome: 1.796 frames apresentados, término normal, nenhum erro de mídia. Foram coletadas imagens durante a reprodução, incluindo pares próximos às mudanças de etapa, e folhas de contato dos vídeos brutos a 4 fps. Artefatos: `output/playwright/v3-audit-original/`. Também foram lidos a composição, os keyframes de câmera e o código de áudio. A inspeção de áudio é de níveis e sincronização de eventos; não equivale a audição humana em alto-falantes.

As observações abaixo são verificáveis nas imagens e no código; não são conclusões sobre comportamento de usuários reais ou conversão.

| Prioridade / tempo | Achado observado | Impacto | Ajuste e critério de aceite |
|---|---|---|---|
| Alta / 17,5; 21; 24,5 s | A escala da jornada reinicia de aproximadamente 1,68 para 1,04 no frame de troca do índice. Os pares antes/depois mostram salto de plano e título momentaneamente vazio. | Interrompe o acompanhamento da animação original. | Uma trilha contínua de câmera, com recuo antecipado e aproximação posterior. Sem descontinuidade de posição/escala nesses frames. |
| Alta / 34–38 s | O formulário inteiro ocupa a mesma região enquanto horário e confirmação recebem quase o mesmo peso do campo de observação. O painel já aparece perto de 37,5 s enquanto o texto ainda diz Sua escolha. | A ação principal e seu resultado perdem destaque. | Câmera acompanha 09:30 → botão → senha; reação e texto seguem o frame de confirmação observado no bruto, perto de 3,1–3,25 s. |
| Alta / 40,4–43,9 s | Posição 4 e estimativa ficam entre vários blocos pequenos; a câmera varia de escala apenas 1 para 1,04. | A informação essencial não é o foco. | Close no cartão de posição, com contexto inicial e tempo de leitura adicional. |
| Média / 4,5–13,5 s | Parte da frase do próprio hero fica cortada à esquerda; grande volume do enquadramento repete o título editorial. | O crop não parece responder ao que está sendo mostrado. | Revelação do detalhe da senha, recuo ao hero e acompanhamento da rolagem até o card da clínica. |
| Média / 28,5–34 s | Pesquisa e detalhes compartilham quase a mesma escala; há espaço inferior ocioso e o robô permanece no mesmo lugar. | Digitação, resultado e navegação não recebem direção distinta. | Plano geral, aproximação no campo e acompanhamento até o resultado; mascote desloca o olhar e sua posição. |
| Média / 43,9–51,4 s | Painel do gestor mantém plano frontal semelhante ao restante; notificações secundárias entram no rodapé do quadro. | Disputa de atenção com chamadas e lista. | Travelling horizontal controlado entre sala e lista; crop exclui a maior parte das notificações; operação permanece integral. |
| Média / quase todas as trocas | A mesma máscara circular é reutilizada, independentemente da relação entre telas. | Ritmo uniforme e continuidade pouco específica. | Transições por direção, card e profundidade; booking → paciente conserva posição e tamanho da senha real. |
| Média / apresentador | Mesmo ciclo de flutuação e posição por longos intervalos; poucas reações a eventos. | Mascote parece sobreposto, não um apresentador. | Deslocamentos curtos motivados, inclinação ao controle observado, reações amortecidas na seleção/confirmação e saída quando houver conflito. Sem novos membros ou desenho. |
| Média / 54,4–60 s | Marca entra cedo, CTA tarde, e uma camada escurece os últimos frames. | A composição final perde força quando deveria permanecer reconhecível. | Mascote e marca em planos distintos, frase progressiva e composição completa mantida por pelo menos 2,5 s, sem fade escurecendo o final. |
| Baixa / áudio | Mix existente está saudável: cerca de −14,2 LUFS e −1,24 dBTP. Alguns cliques e confirmação usam tempos aproximados. | O problema é de sincronismo, não de volume geral. | Preservar a base instrumental e realinhar eventos aos brutos; menos impactos repetidos. |

## Plano por cena

- **Abertura:** preservar pergunta, linha ciano e SVG; entrada com deslocamento e reação a palavras, seguida de aproximação para o hero.
- **Home:** três momentos de câmera: detalhe → contexto → clínica. Usar 8,5 s do bruto atual, sem aceleração.
- **Jornada:** preservar os 15 s completos e as quatro transições nativas; novo enquadramento móvel, com continuidade matemática entre etapas e menor quantidade de texto simultâneo.
- **Pesquisa:** aproximar o campo durante a digitação, descer com o resultado e revelar os detalhes. Preservar 5,5 s reais.
- **Agendamento:** câmera orientada aos controles; ligação espacial entre senha confirmada e início do acompanhamento.
- **Paciente:** dar 4 s à leitura, usando reprodução a 0,875× do trecho de 3,5 s. Mostrar primeiro contexto e depois posição; não inventar atualização de dados.
- **Gestor:** conservar os 7,5 s de operações; travelling entre atendimento e pacientes, com foco retornando ao botão de chamada.
- **Chamada e encerramento:** associar a mesma senha entre gestor e paciente; transição de profundidade para marca, mascote e frase, com sustentação final.

## Decisão de captura

Apenas o gestor recebeu regravação, depois da primeira revisão de enquadramentos: os close-ups tornaram muito evidentes avisos antigos de login e saída. O modo `--manager-v3` prepara o mesmo cenário fictício, autentica pelas telas originais e limpa notificações anteriores antes de começar. Durante a gravação, os quatro cliques de chamada e suas notificações reais permanecem ativos. A senha fictícia é preparada deterministicamente como A-071 para conservar a continuidade, sem alterar validações ou regras do aplicativo.

Os sete brutos anteriores e o master da V2 serão preservados byte a byte; a nova gravação fica em `manager-v3.mp4`. Os maiores aumentos ficam restritos às regiões relevantes, em torno de 1,5–1,85 pixels de saída por pixel de origem, evitando zoom ilimitado. Os arquivos de edição anteriores também foram copiados para `archive/v2-src/` para consulta.

## Validação prevista

Revisar frames de contexto, close-up e transição antes do render completo; conferir trajetória contínua, zonas de texto e ausência de sobreposição do apresentador com os controles destacados. Depois: decodificação integral, metadados, medição de áudio, reprodução dos 60 s exportados no Chrome e nova inspeção dos frames do próprio MP4. Sem mudanças no site ou no banco.
