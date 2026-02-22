import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_APP_PASSWORD = Deno.env.get("GMAIL_APP_PASSWORD");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VagaNotificationData {
  type: "atribuicao" | "remocao";
  analista_email: string;
  analista_nome: string;
  analista_cargo: string;
  funcionario_saiu: string;
  cargo_saiu: string;
  data_abertura_vaga: string;
  dias_em_aberto: number;
  unidade?: string;
  app_url: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    console.log("[DEBUG] Raw body recebido:", JSON.stringify(rawBody));

    // Lidar com ambos os formatos (direto ou dentro de 'body')
    const notificationData: VagaNotificationData = rawBody.body || rawBody;

    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
      console.error("[ERRO] Credenciais do Gmail não configuradas!");
      throw new Error("Gmail credentials not configured");
    }

    if (!notificationData.analista_email) {
      console.error("[ERRO] Email do analista não fornecido!");
      throw new Error("Email do analista não fornecido");
    }

    console.log(`[INFO] Enviando email para ${notificationData.analista_email} via Gmail SMTP`);

    const htmlContent = `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 10px; color: #1f2937;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 32px; border-collapse: separate; overflow: hidden; border: 1px solid #e5e7eb;">
    <tr>
      <td style="background-color: #1c4482; padding: 35px 20px; text-align: center; border-radius: 32px 32px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 1px;">GESTÃO DE VAGAS</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px 20px 30px;">
        <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 20px; font-weight: 700;">Olá, ${notificationData.analista_nome}</h2>
        <p style="color: #4b5563; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          Uma nova vaga foi atribuída a você no sistema. Confira os detalhes abaixo:
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px; padding: 25px; margin-bottom: 35px;">
          <h3 style="margin-top: 0; margin-bottom: 20px; color: #1c4482; font-size: 14px; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 800;">Detalhes da Vaga</h3>
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="padding-bottom: 15px; color: #64748b; font-size: 13px; font-weight: 600;" width="120">CARGO:</td>
              <td style="padding-bottom: 15px; color: #1e293b; font-size: 15px; font-weight: 700;">${notificationData.cargo_saiu}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 15px; color: #64748b; font-size: 13px; font-weight: 600;">VAGA DE:</td>
              <td style="padding-bottom: 15px; color: #1e293b; font-size: 15px;">${notificationData.funcionario_saiu}</td>
            </tr>
            <tr>
              <td style="padding-bottom: 15px; color: #64748b; font-size: 13px; font-weight: 600;">ABERTURA:</td>
              <td style="padding-bottom: 15px; color: #1e293b; font-size: 15px;">${notificationData.data_abertura_vaga}</td>
            </tr>
            ${notificationData.unidade ? `
            <tr>
              <td style="padding-bottom: 15px; color: #64748b; font-size: 13px; font-weight: 600;">UNIDADE:</td>
              <td style="padding-bottom: 15px; color: #1e293b; font-size: 15px;">${notificationData.unidade}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="color: #64748b; font-size: 13px; font-weight: 600;">TEMPO:</td>
              <td style="color: #ef4444; font-size: 15px; font-weight: 700;">${notificationData.dias_em_aberto} dias em aberto</td>
            </tr>
          </table>
        </div>

        <table border="0" cellspacing="0" cellpadding="0" align="center" style="margin-bottom: 20px;">
          <tr>
            <td align="center" style="border-radius: 50px;" bgcolor="#1c4482">
              <a href="${notificationData.app_url}" target="_blank" style="font-size: 16px; font-family: sans-serif; color: #ffffff; text-decoration: none; border-radius: 50px; padding: 16px 50px; border: 1px solid #1c4482; display: inline-block; font-weight: 700; letter-spacing: 0.5px;">
                Acessar Minhas Vagas
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="background-color: #f9fafb; padding: 25px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
        Este é um e-mail automático enviado pelo Sistema de Gestão de Vagas.<br>
        Por favor, não responda a esta mensagem.
      </td>
    </tr>
  </table>
</div>
`.replace(/>\s+</g, '><').trim();

    const textContent = `Olá, ${notificationData.analista_nome}\n\nUma nova vaga foi atribuída a você no sistema de Gestão de Vagas.\n\nDetalhes da Vaga:\n- Cargo: ${notificationData.cargo_saiu}\n- Vaga de: ${notificationData.funcionario_saiu}\n- Abertura: ${notificationData.data_abertura_vaga}${notificationData.unidade ? `\n- Unidade: ${notificationData.unidade}` : ''}\n- Tempo: ${notificationData.dias_em_aberto} dias em aberto\n\nAcesse no link: ${notificationData.app_url}`;



    // Conectar ao Gmail SMTP
    const client = new SMTPClient({
      connection: {
        hostname: "smtp.gmail.com",
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });

    // Enviar email
    await client.send({
      from: GMAIL_USER,
      to: notificationData.analista_email,
      subject: `Nova Vaga Atribuída: ${notificationData.cargo_saiu}`,
      content: textContent,
      html: htmlContent,
    });

    await client.close();

    console.log("[SUCESSO] Email enviado com sucesso via Gmail!");

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[ERRO] Exception na function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
