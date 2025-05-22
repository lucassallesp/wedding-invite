/* eslint-disable @typescript-eslint/no-var-requires */
/* global console */
import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode-terminal';
import process from 'node:process';
import fs from 'fs';
import csv from 'csv-parser';
import readline from 'readline';
import path from 'path';

const enviado_por = 'lucas';

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    console.log('Escaneie o QR Code usando o WhatsApp em seu celular.');
    qrcode.generate(qr, { small: true });
});

client.on('ready', async () => {
    console.log('Cliente está pronto!');
    await loadConvidadosAndSendMessages();
});

client.on('authenticated', () => {
    console.log('Autenticação realizada com sucesso!');
});

client.on('auth_failure', msg => {
    console.error('Falha na autenticação', msg);
});

client.on('disconnected', (reason) => {
    console.log('Cliente desconectado', reason);
});

client.on('error', (err) => {
    console.error('Erro detectado:', err);
});

console.log('Inicializando cliente...');
client.initialize();

const mensagemTemplate1 = (nome, letra, codigo) => `💍 Querid${letra} ${nome}, está chegando o grande dia do nosso casamento!
E você está mais do que convidad${letra} pra essa cerimonia e festa cheia de amor, alegria!

🗓 *Save the Date*
A nossa história vai ganhar um novo capítulo no dia
04 de outubro de 2025,
e queremos que você faça parte desse momento tão único para nós! ❤

✅ *Confirmação de Presença*
A sua presença vai fazer toda a diferença no nosso grande dia!
Por isso, não esquece de confirmar se vai poder estar com a gente nessa celebração tão especial. 🫶

Abaixo se encontra um link exclusivo com o seu código de confirmação. Ele é pessoal e intransferível, então não pode ser compartilhado, tá bom?
É rapidinho e super importante pra organizarmos tudo com carinho e garantir seu lugar na pista de dança 💃🕺!

👉 Clique para confirmar presença: rsvp.kamilucas.com.br/${codigo}

🚨 *ATENÇÃO* 🚨

No link abaixo você terá acesso ao convite, digital onde estão contidas as informações (localização da igreja e do cerimonial, horários, lista de presente e outros detalhes importantes)

👉 Acesse seu convite para mais detalhes:
💌 bit.ly/convite-kamila-lucas

Prepara o look, o coração e o passinho na pista!

Com amor e carinho
*Kamila & Lucas*`;

const mensagemTemplate2 = (nome, letra, codigo) => `💍 Querid${letra} ${nome}, está chegando o grande dia do nosso casamento!
E você está mais do que convidad${letra} pra essa cerimonia e festa cheia de amor, alegria!

🗓 *Save the Date*
A nossa história vai ganhar um novo capítulo no dia
04 de outubro de 2025,
e queremos que você faça parte desse momento tão único para nós! ❤

✅ *Confirmação de Presença*
A sua presença vai fazer toda a diferença no nosso grande dia!
Por isso, não esquece de confirmar se vai poder estar com a gente nessa celebração tão especial.

Abaixo se encontra um link exclusivo com o seu código de confirmação. Ele é pessoal e intransferível, então não pode ser compartilhado, tá bom?
É rapidinho e super importante pra organizarmos tudo com carinho e garantir seu lugar na festa!

👉 Clique para confirmar presença: rsvp.kamilucas.com.br/${codigo}

🚨 *ATENÇÃO* 🚨

No link abaixo você terá acesso ao convite, digital onde estão contidas as informações (localização da igreja e do cerimonial, horários, lista de presente e outros detalhes importantes)

👉 Acesse seu convite para mais detalhes:
💌 bit.ly/convite-kamila-lucas

Com amor
*Kamila & Lucas*`;

async function loadConvidadosAndSendMessages() {
    const convidados = [];
    const csvPath = path.join(process.cwd(), 'assets', 'convidados_codigos_wedkamilu.csv');
    fs.createReadStream(csvPath, { encoding: 'utf8' })
        .pipe(csv({ separator: ';' }))
        .on('data', (data) => {
            convidados.push({
                nome: data.nome,
                genero: data.genero,
                codigo: data.codigo,
                telefone: data.telefone,
                enviado: data.enviado,
                enviado_por: data.enviado_por,
                tipo_mensagem: data.tipo_mensagem
            });
        })
        .on('end', async () => {
            for (const convidado of convidados) {
                if (convidado.enviado === 'sim') {
                    console.log(`Mensagem já enviada para ${convidado.nome}. Pulando...\n`);
                    continue;
                }    

                if (convidado.enviado_por !== enviado_por) {
                    console.log(`Contato da ${convidado.enviado_por}. Pulando...\n`);
                    continue;
                }

                if (!convidado.telefone) {
                    console.log(`Sem número de telefone para ${convidado.nome}. Pulando...\n`);
                    continue;
                }

                const nome = convidado.nome;
                const letra = (convidado.genero === 'masculino' ? 'o' : 'a');
                const codigoConvidado = convidado.codigo;

                const mensagemTemplate = convidado.tipo_mensagem === '1' ? mensagemTemplate1 : mensagemTemplate2;
                const mensagem = mensagemTemplate(nome, letra, codigoConvidado);

                console.log(mensagem);
                console.log(`Deseja enviar essa mensagem para ${convidado.nome}? [S] para sim, [N] para não`);

                const confirmacao = await obterConfirmacao();                
                if (confirmacao === 'S') {
                    const chatId = `${convidado.telefone}@c.us`;
                    try {                      
                        const imagePath = path.join(process.cwd(), 'assets', 'lucas-kamila.jpg');
                        const envioSucesso = await enviarMensagem(client, chatId, imagePath, mensagem);
                        
                        console.clear();
                        console.log(`Mensagem enviada para: ${convidado.nome}\n`);
                        
                        if (envioSucesso) {
                            await atualizarStatusEnvio(convidado);
                        }
                    } catch (err) {
                        console.error(`Erro ao enviar mensagem para ${convidado.nome}: \n`, err);
                    }
                } else {
                    console.clear();
                    console.log(`Mensagem para ${convidado.nome} não enviada.\n`);
                }
            }
        }
    );
}

function obterConfirmacao() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        const perguntar = () => {
            rl.question('Digite sua resposta: ', (resposta) => {
                const respostaFormatada = resposta.trim().toUpperCase();
                if (respostaFormatada === 'S' || respostaFormatada === 'N') {
                    rl.close();
                    resolve(respostaFormatada);
                } else {
                    console.log("Entrada inválida. Por favor, digite 'S' para sim ou 'N' para não.\n");
                    perguntar();
                }
            });
        };
        perguntar();
    });
}

async function enviarMensagem(client, chatId, imagePath, caption = '') {
    try {
        if (fs.existsSync(imagePath)) {
            const media = MessageMedia.fromFilePath(imagePath);
            await client.sendMessage(chatId, media, { caption });
            return true;
        } else {
            console.log(`Imagem não encontrada: ${imagePath}`);
            return false;
        }
    } catch (error) {
        console.error('Erro ao enviar imagem:', error);
        return false;
    }
}

async function atualizarStatusEnvio(convidado) {
    try {
        const arquivoCSV = path.join(process.cwd(), 'assets', 'convidados_codigos_wedkamilu.csv');
        
        const conteudoAtual = fs.readFileSync(arquivoCSV, 'utf8');
        const linhas = conteudoAtual.split('\n');
        let encontrado = false;
        
        const linhasAtualizadas = linhas.map(linha => {
            if (!linha.trim()) return linha;
            
            const campos = linha.split(';');
            
            if (campos.length >= 6 && 
                campos[1].trim() === convidado.nome.trim() && 
                campos[4].trim() === convidado.telefone.trim()) {
                
                campos[5] = 'sim';
                encontrado = true;
                return campos.join(';');
            }
            return linha;
        });
        
        if (!encontrado) {
            console.log(`Não foi possível encontrar o registro para ${convidado.nome} no CSV.`);
            console.log(`Procurando por: Nome=${convidado.nome}, Telefone=${convidado.telefone}`);
            return false;
        }
        
        fs.writeFileSync(arquivoCSV, linhasAtualizadas.join('\n'), 'utf8');
        console.log(`Status de envio atualizado para ${convidado.nome}`);
        return true;
    } catch (error) {
        console.error('Erro ao atualizar o status de envio:', error);
        return false;
    }
}