import puppeteer from "puppeteer";
import fs from 'fs';
import path from 'path';

(async () => {
  let success = false;

  while (!success) {
    const browser = await puppeteer.launch({
      headless: false, // Alterar para true para rodar em background em produção
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    try {
      // 1. Acessa a página de conversão
      await page.goto('https://converter.app/mp3-to-midi/', { timeout: 60000 });

      // 2. Aguarda o carregamento do form
      await page.waitForSelector('#form-element', { timeout: 60000 });

      // 3. Envia o arquivo mp3 para conversão
      const filePath = path.resolve(process.cwd(), 'famintø.mp3');
      const inputUploadHandle = await page.$('input[type=file]');
      await inputUploadHandle.uploadFile(filePath);

      // 4. Espera 5 segundos para o carregamento do arquivo
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 5. Fecha anúncios se existirem - Tenta várias vezes
      let closeAdTries = 0;
      const maxAdTries = 5;
      while (closeAdTries < maxAdTries) {
        const closeAdButton = await page.$('.close-ad-button-selector');
        if (closeAdButton) {
          await closeAdButton.click();
          console.log('Anúncio fechado.');
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
        closeAdTries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 6. Captura screenshot antes de verificar o botão de download
      await page.screenshot({ path: 'before_click.png' });

      let downloadAvailable = false;
      // Verifica se o botão de download está disponível
      const downloadButton = await page.$('button.btn');
      if (downloadButton) {
        console.log('Botão de download já está disponível, pulando o botão de submit.');
        downloadAvailable = true;
      }

      // Se o botão de download não está disponível, tenta enviar o formulário
      if (!downloadAvailable) {
        console.log('Botão de download não disponível ainda, tentando clicar no botão de submit.');

        // 7. Clica no botão de submit - Tenta várias vezes até conseguir
        let submitTries = 0;
        const maxSubmitTries = 5;
        while (submitTries < maxSubmitTries) {
          const submitButton = await page.$('button[type=submit]');
          if (submitButton) {
            // Verifica se o botão está visível
            const isVisible = await page.evaluate((button) => {
              const rect = button.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 && window.getComputedStyle(button).visibility !== 'hidden';
            }, submitButton);

            if (!isVisible) {
              console.error('O botão de submit não está visível ou clicável.');
              await page.screenshot({ path: 'submit_button_not_clickable.png' });
              return;
            }

            // Rolando até o botão para garantir que ele esteja na tela
            await submitButton.evaluate(button => button.scrollIntoView());

            // Força o clique via JS
            await page.evaluate(button => button.click(), submitButton);
            console.log('Botão de submit clicado.');
            
            // Espera a navegação após a submissão do formulário
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
            break;
          }
          submitTries++;
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        if (submitTries === maxSubmitTries) {
          console.error('Falha ao clicar no botão de envio após várias tentativas.');
          return;
        }
      }

      // *** CONTINUA COM O DOWNLOAD SE O BOTÃO JÁ ESTIVER DISPONÍVEL ***
      const downloadButtonFinal = await page.waitForSelector('button.btn', { visible: true, timeout: 60000 }); 
      await downloadButtonFinal.click();
      console.log('Botão de download clicado.');

      // 11. Verifica se o diretório existe, senão cria
      const midiDir = path.resolve(process.cwd(), 'mp3-to-midi');
      if (!fs.existsSync(midiDir)) {
        fs.mkdirSync(midiDir);
      }

      // 12. Tira um screenshot após clicar no download
      await page.screenshot({ path: path.join(midiDir, 'converter-midi.png') });

      await browser.close();
      success = true;
      console.log('Conversão concluída com sucesso!');
    } catch (error) {
      console.error('Erro durante o processo de conversão:', error);
      await browser.close();
    }
  }
})();