# VEZZ — edição curta de 37 segundos

Composição: `VEZZ-Reel-Curto`. Resolução do master: 1080 × 1920, 30 fps.

| Tempo | Conteúdo |
|---|---|
| 0–2,5 s | Pergunta de abertura, marca e mascote oficial. |
| 2,5–6 s | Home: detalhe da senha e abertura para o contexto da plataforma. |
| 6–11,5 s | Busca por especialidade, resultado e acesso à clínica. |
| 11,5–17,9 s | Escolha do horário, confirmação e senha gerada. |
| 17,9–21,9 s | Painel do paciente, posição e estimativa de espera. |
| 21,9–29,4 s | Recepção: fila, chamadas e evolução real dos atendimentos locais. |
| 29,4–32,4 s | Mesma senha A-071 em atendimento no painel do paciente. |
| 32,4–37 s | Encerramento com marca, mascote e chamada para conhecer a plataforma. |

O bloco explicativo de 15 segundos foi retirado porque antecipava as mesmas quatro etapas demonstradas nas telas práticas. A home passou de 8,5 para 3,5 segundos, com um enquadramento final que inclui o título original. A abertura e o encerramento foram condensados. A duração total caiu de 60 para 37 segundos, redução de aproximadamente 38%.

Busca, agendamento, paciente, gestor e chamada conservam as durações, velocidades, movimentos de câmera, textos e sincronização da V3. A leitura do paciente continua a 0,875×. Os quatro atendimentos do gestor permanecem para conservar a continuidade da senha. A jornada funcional aparece uma vez, nas telas reais. Os cortes têm sobreposição de 22 frames; os frames de sustentação ficam sob a máscara da cena seguinte.

A trilha mantém a instrumentação autoral a 120 BPM e foi recomposta para 37 segundos. Os efeitos foram deslocados para os novos tempos de seleção, confirmação e chamada, com saída suave no final. O vídeo mantém Source Sans 3, Mokoto, azuis do VEZZ e SVGs oficiais. Não há nova dependência.

## Arquivos e reprodução

- Master: `final/VEZZ_Reel_Curto_37s.mp4`.
- Prévia leve: `final/VEZZ_Reel_Curto_Previa.mp4`.
- Projeto editável: `final/VEZZ_Projeto_Editavel_Curto.zip`.
- Verificações executadas: `final/quality-report-short.json` e `final/preview-quality-report-short.json`.
- Revisão visual: `../output/playwright/short-review/` e `../output/playwright/short-final-review/`.

Execute dentro de `video-vezz/`:

```sh
npm run finish:short
```

O comando produz o áudio, renderiza o master, verifica resolução, duração, decodificação integral e níveis de áudio, reproduz o MP4 completo no Chrome e deriva a prévia. Também empacota e verifica o ZIP por descompressão/CRC. `npm run studio` permite editar a composição `VEZZ-Reel-Curto`; `npm run render:short` renderiza usando o áudio já preparado.

A verificação compara por SHA-256 os arquivos anteriores registrados no baseline. No diretório original, inclui os vídeos finais anteriores e o ZIP anterior; no projeto portátil, a comparação é limitada aos arquivos de origem incluídos no pacote. A edição usa as gravações locais já existentes e dados fictícios. Não há regravação ou conexão com o banco para produzir esta versão.

A medição de volume e a reprodução no navegador verificam aspectos técnicos; não equivalem à audição humana em alto-falantes.
